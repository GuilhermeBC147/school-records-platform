#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

: "${BACKUP_DIR:?BACKUP_DIR is required}"
max_age_hours="${BACKUP_MAX_AGE_HOURS:-30}"
marker="$BACKUP_DIR/.last-success"

fail_check() {
  send_alert critical "$1" || true
  echo "$1" >&2
  exit 1
}

if [[ ! -r "$marker" ]]; then
  fail_check "No successful PostgreSQL backup marker exists."
fi

epoch="$(sed -n 's/^epoch=//p' "$marker")"
dump="$(sed -n 's/^dump=//p' "$marker")"
offsite="$(sed -n 's/^offsite=//p' "$marker")"

if [[ ! "$epoch" =~ ^[0-9]+$ || ! "$max_age_hours" =~ ^[0-9]+$ ]]; then
  fail_check "The backup success marker or BACKUP_MAX_AGE_HOURS is invalid."
fi

age_seconds=$(( $(date +%s) - epoch ))
if (( age_seconds > max_age_hours * 3600 )); then
  fail_check "The latest successful PostgreSQL backup is older than ${max_age_hours} hours."
fi

if [[ ! -s "$BACKUP_DIR/$dump" || ! -s "$BACKUP_DIR/$dump.sha256" ]]; then
  fail_check "The latest PostgreSQL dump or checksum file is missing."
fi

if [[ "${REQUIRE_OFFSITE_BACKUP:-true}" == "true" && "$offsite" != "verified" ]]; then
  fail_check "The latest PostgreSQL backup has no verified off-VPS copy."
fi

(cd "$BACKUP_DIR" && sha256sum --check --status "$dump.sha256") \
  || fail_check "The latest PostgreSQL backup checksum does not match."

echo "Backup freshness and checksum are valid: $dump"
