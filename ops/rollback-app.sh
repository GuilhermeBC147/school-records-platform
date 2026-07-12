#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

state_dir="$REPO_DIR/.deploy"
rollback_image="${1:-}"
if [[ -z "$rollback_image" && -r "$state_dir/previous-image" ]]; then
  rollback_image="$(cat "$state_dir/previous-image")"
fi

if [[ -z "$rollback_image" || "$rollback_image" =~ [[:space:]] ]]; then
  echo "No previous application image is recorded. Pass an immutable image reference explicitly." >&2
  exit 1
fi

echo "This replaces only the application image. It does not reverse database migrations."
echo "Continue only after confirming the older app is compatible with the current migrated schema."

current_image="${APP_IMAGE:-}"
export APP_IMAGE="$rollback_image"
docker pull "$APP_IMAGE"
compose up -d --no-deps app
wait_for_healthy_container app 180

printf '%s\n' "$current_image" >"$state_dir/previous-image"
printf '%s\n' "$APP_IMAGE" >"$state_dir/current-image"
send_alert warning "Application image was rolled back to $APP_IMAGE; database migrations were unchanged." || true
echo "Application rollback passed readiness: $APP_IMAGE"
