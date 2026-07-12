#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

: "${BACKUP_DIR:?BACKUP_DIR is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

backup_file="${1:-$(latest_backup_file)}"
target_database="${2:-school_records_restore_$(date -u +'%Y%m%d_%H%M%S')}"

if [[ -z "$backup_file" || ! -s "$backup_file" ]]; then
  echo "Backup archive was not found: ${backup_file:-<none>}" >&2
  exit 1
fi

if [[ ! "$target_database" =~ ^[a-z][a-z0-9_]*$ ]]; then
  echo "Temporary database name must use lowercase letters, digits, and underscores." >&2
  exit 1
fi

if [[ "$target_database" == "$POSTGRES_DB" ]]; then
  echo "Refusing to restore over the production database." >&2
  exit 1
fi

checksum_file="$backup_file.sha256"
if [[ ! -s "$checksum_file" ]]; then
  echo "Checksum file is missing: $checksum_file" >&2
  exit 1
fi

(cd "$(dirname "$backup_file")" && sha256sum --check --status "$(basename "$checksum_file")") \
  || { echo "Backup checksum verification failed." >&2; exit 1; }

exists="$(compose exec -T postgres psql --username "$POSTGRES_USER" --dbname postgres --tuples-only --no-align \
  --command "SELECT 1 FROM pg_database WHERE datname = '$target_database'")"
if [[ "$exists" == "1" ]]; then
  echo "Target database already exists; refusing to overwrite it: $target_database" >&2
  exit 1
fi

compose exec -T postgres createdb --username "$POSTGRES_USER" --owner "$POSTGRES_USER" "$target_database"

on_error() {
  local exit_code=$?
  compose exec -T postgres dropdb --username "$POSTGRES_USER" --if-exists "$target_database" >/dev/null 2>&1 || true
  exit "$exit_code"
}
trap on_error ERR

compose exec -T postgres pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$target_database" \
  --exit-on-error \
  --no-owner \
  --no-acl <"$backup_file"

trap - ERR
echo "$target_database"
