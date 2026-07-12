#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

compose up -d postgres app caddy
wait_for_healthy_container postgres 180
wait_for_healthy_container app 180
echo "Production services are running and readiness passed."
