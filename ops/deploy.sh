#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

revision="${1:-}"
new_app_image="${2:-}"
new_migration_image="${3:-}"

if [[ ! "$revision" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: deploy.sh <40-character-git-sha> <app-image> <migration-image>" >&2
  exit 2
fi
if [[ -z "$new_app_image" || -z "$new_migration_image" || "$new_app_image$new_migration_image" =~ [[:space:]] ]]; then
  echo "Both immutable image references are required and cannot contain whitespace." >&2
  exit 2
fi

require_command docker
require_command git
require_command flock

mkdir -p "$REPO_DIR/.deploy"
exec 9>"$REPO_DIR/.deploy/deploy.lock"
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 1
fi

on_error() {
  local exit_code=$?
  send_alert critical "Deployment of $revision failed (exit $exit_code). Database migrations are never rolled back automatically." || true
  exit "$exit_code"
}
trap on_error ERR

cd "$REPO_DIR"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "The production checkout has tracked changes; refusing to overwrite operator work." >&2
  exit 1
fi

git fetch --prune origin
git cat-file -e "$revision^{commit}"
git checkout --detach "$revision"

export APP_IMAGE="$new_app_image"
export MIGRATION_IMAGE="$new_migration_image"

compose config --quiet
docker pull "$APP_IMAGE"
docker pull "$MIGRATION_IMAGE"

postgres_volume="school-records-platform_postgres-data"
existing_database=false
if docker volume inspect "$postgres_volume" >/dev/null 2>&1; then
  existing_database=true
fi

compose up -d postgres
wait_for_healthy_container postgres 180
compose exec -T postgres sh /docker-entrypoint-initdb.d/10-ensure-app-role.sh

if [[ "$existing_database" == "true" ]]; then
  "$SCRIPT_DIR/backup-postgres.sh" pre-deploy
else
  echo "First deployment: no pre-existing PostgreSQL volume was present, so there is nothing to back up before initial migrations."
fi

compose --profile operations run --rm migration
compose up -d --no-deps app
wait_for_healthy_container app 180
compose up -d --no-deps caddy

previous_image=""
if [[ -r "$REPO_DIR/.deploy/current-image" ]]; then
  previous_image="$(cat "$REPO_DIR/.deploy/current-image")"
fi
printf '%s\n' "$previous_image" >"$REPO_DIR/.deploy/previous-image"
printf '%s\n' "$APP_IMAGE" >"$REPO_DIR/.deploy/current-image"
printf '%s\n' "$MIGRATION_IMAGE" >"$REPO_DIR/.deploy/current-migration-image"
printf '%s\n' "$revision" >"$REPO_DIR/.deploy/current-revision"

trap - ERR
send_alert info "Deployment of $revision completed and database-backed readiness passed." || true
echo "Deployment completed: $revision"
