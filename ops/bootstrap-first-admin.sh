#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

if [[ ! -r "$REPO_DIR/.deploy/current-migration-image" ]]; then
  echo "Conclua a primeira implantação antes de criar o administrador inicial." >&2
  exit 1
fi

compose --profile operations run --rm --entrypoint node migration \
  /app/ops/bootstrap-first-admin.mjs
