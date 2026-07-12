#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

backup_file="${1:-$(latest_backup_file)}"
target_database="school_records_rehearsal_$(date -u +'%Y%m%d_%H%M%S')"

cleanup() {
  if [[ "${KEEP_RESTORE_DATABASE:-false}" != "true" ]]; then
    compose exec -T postgres dropdb --username "$POSTGRES_USER" --if-exists "$target_database" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

restored_database="$("$SCRIPT_DIR/restore-postgres.sh" "$backup_file" "$target_database")"
if [[ "$restored_database" != "$target_database" ]]; then
  echo "Restore script returned an unexpected database name." >&2
  exit 1
fi

verification="$(compose exec -T postgres psql --username "$POSTGRES_USER" --dbname "$target_database" \
  --tuples-only --no-align --set=ON_ERROR_STOP=1 <<'SQL'
WITH required_tables(name) AS (
  VALUES
    ('User'), ('Class'), ('Student'), ('Lesson'),
    ('AttendanceRecord'), ('HomeworkRecord'),
    ('PartialEvaluationGrade'), ('TestGrade'),
    ('StudentRiskResolution'), ('ImportBatch'), ('ImportRow'),
    ('BonusClass'), ('PersonalSlotBooking'),
    ('TeacherWorkLog'), ('TeacherWorkLogStudent')
), missing AS (
  SELECT name FROM required_tables WHERE to_regclass('public.' || quote_ident(name)) IS NULL
)
SELECT CASE WHEN EXISTS (SELECT 1 FROM missing)
  THEN 'missing:' || (SELECT string_agg(name, ',') FROM missing)
  ELSE 'ok'
END;
SQL
)"

if [[ "$verification" != "ok" ]]; then
  echo "Restore rehearsal schema verification failed: $verification" >&2
  exit 1
fi

counts_query='
SELECT concat_ws(chr(44),
  (SELECT count(*) FROM "User"),
  (SELECT count(*) FROM "Class"),
  (SELECT count(*) FROM "Lesson"),
  (SELECT count(*) FROM "Lesson" WHERE "substitutionStatus" <> '\''NONE'\''),
  (SELECT count(*) FROM "AttendanceRecord"),
  (SELECT count(*) FROM "HomeworkRecord"),
  (SELECT count(*) FROM "PartialEvaluationGrade") + (SELECT count(*) FROM "TestGrade"),
  (SELECT count(*) FROM "StudentRiskResolution"),
  (SELECT count(*) FROM "ImportBatch"),
  (SELECT count(*) FROM "BonusClass"),
  (SELECT count(*) FROM "PersonalSlotBooking"),
  (SELECT count(*) FROM "TeacherWorkLog"),
  (SELECT count(*) FROM "TeacherWorkLogStudent")
);'

source_counts="$(compose exec -T postgres psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command "$counts_query")"
restored_counts="$(compose exec -T postgres psql --username "$POSTGRES_USER" --dbname "$target_database" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command "$counts_query")"

if [[ "$source_counts" != "$restored_counts" ]]; then
  echo "Restore rehearsal record counts differ. Source: $source_counts; restored: $restored_counts" >&2
  exit 1
fi

echo "Restore rehearsal passed in temporary database: $target_database"
echo "Matched source/restored counts (accounts, classes, lessons, substitutions, attendance, homework, grades, risk resolutions, imports, bonus classes, personal bookings, work logs, work-log students): $restored_counts"
