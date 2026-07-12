#!/usr/bin/env bash
set -Eeuo pipefail

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$OPS_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-/etc/school-records-platform/production.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/docker-compose.production.yml}"

load_environment() {
  if [[ ! -r "$ENV_FILE" ]]; then
    echo "Production environment file is not readable: $ENV_FILE" >&2
    return 1
  fi

  set -a
  # The operator-owned file uses shell-compatible KEY=value entries.
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  # Successful deployments record immutable image references outside the
  # protected secret file. This keeps restart/backup commands on the last
  # known-good release without granting the deployment user write access to
  # production secrets.
  local state_dir="$REPO_DIR/.deploy"
  if [[ -r "$state_dir/current-image" ]]; then
    APP_IMAGE="$(<"$state_dir/current-image")"
    export APP_IMAGE
  fi
  if [[ -r "$state_dir/current-migration-image" ]]; then
    MIGRATION_IMAGE="$(<"$state_dir/current-migration-image")"
    export MIGRATION_IMAGE
  fi
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command is not installed: $1" >&2
    return 1
  fi
}

send_alert() {
  local severity="$1"
  local message="$2"

  if [[ -z "${ALERT_WEBHOOK_URL:-}" ]]; then
    echo "ALERT_WEBHOOK_URL is not configured; alert was written only to stderr: [$severity] $message" >&2
    return 0
  fi

  require_command python3
  require_command curl

  local payload
  payload="$(python3 - "$severity" "$message" <<'PY'
import json
import socket
import sys

print(json.dumps({
    "severity": sys.argv[1],
    "service": "school-records-platform",
    "host": socket.gethostname(),
    "message": sys.argv[2],
}))
PY
)"

  curl --fail --silent --show-error \
    --connect-timeout 10 \
    --max-time 20 \
    -H "Content-Type: application/json" \
    --data "$payload" \
    "$ALERT_WEBHOOK_URL" >/dev/null
}

wait_for_healthy_container() {
  local service="$1"
  local timeout_seconds="${2:-120}"
  local started_at
  started_at="$(date +%s)"

  while (( "$(date +%s)" - started_at < timeout_seconds )); do
    local container_id status
    container_id="$(compose ps -q "$service")"
    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$status" == "healthy" || "$status" == "running" ]]; then
        return 0
      fi
    fi
    sleep 2
  done

  echo "Timed out waiting for $service to become healthy." >&2
  compose ps >&2 || true
  compose logs --tail 100 "$service" >&2 || true
  return 1
}

latest_backup_file() {
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'school-records-*.dump' -printf '%T@ %p\n' \
    | sort -nr \
    | head -n 1 \
    | cut -d' ' -f2-
}
