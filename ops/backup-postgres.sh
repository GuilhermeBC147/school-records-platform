#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

require_command docker
require_command sha256sum

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"

if [[ "$BACKUP_DIR" == "/" || ${#BACKUP_DIR} -lt 8 ]]; then
  echo "Refusing unsafe BACKUP_DIR: $BACKUP_DIR" >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
basename="school-records-$timestamp.dump"
partial="$BACKUP_DIR/.$basename.partial"
final="$BACKUP_DIR/$basename"
checksum="$final.sha256"
success_tmp="$BACKUP_DIR/.last-success.partial"
reason="${1:-scheduled}"

cleanup() {
  rm -f "$partial" "$success_tmp"
}

on_error() {
  local exit_code=$?
  cleanup
  send_alert critical "PostgreSQL backup failed during '$reason' (exit $exit_code)." || true
  exit "$exit_code"
}

trap on_error ERR
trap cleanup EXIT

compose exec -T postgres pg_dump \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-acl >"$partial"

if [[ ! -s "$partial" ]]; then
  echo "pg_dump produced an empty archive." >&2
  exit 1
fi

compose exec -T postgres pg_restore --list <"$partial" >/dev/null

digest="$(sha256sum "$partial" | awk '{print $1}')"
mv "$partial" "$final"
printf '%s  %s\n' "$digest" "$basename" >"$checksum"

offsite_status="not-configured"
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  require_command rclone
  remote_dir="${RCLONE_REMOTE%/}"
  rclone copyto "$final" "$remote_dir/$basename" --checksum
  rclone copyto "$checksum" "$remote_dir/$basename.sha256" --checksum
  rclone check "$BACKUP_DIR" "$remote_dir" --include "$basename" --one-way --download
  offsite_status="verified"
elif [[ "${REQUIRE_OFFSITE_BACKUP:-true}" == "true" ]]; then
  echo "RCLONE_REMOTE is required but not configured." >&2
  exit 1
fi

retention_days="${BACKUP_RETENTION_DAYS:-30}"
if [[ ! "$retention_days" =~ ^[0-9]+$ ]] || (( retention_days < 1 )); then
  echo "BACKUP_RETENTION_DAYS must be a positive integer." >&2
  exit 1
fi

find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'school-records-*.dump' -o -name 'school-records-*.dump.sha256' \) \
  -mtime "+$retention_days" -delete

cat >"$success_tmp" <<EOF
epoch=$(date +%s)
dump=$basename
sha256=$digest
offsite=$offsite_status
EOF
mv "$success_tmp" "$BACKUP_DIR/.last-success"

trap - ERR
echo "Backup completed: $final (offsite: $offsite_status)"
