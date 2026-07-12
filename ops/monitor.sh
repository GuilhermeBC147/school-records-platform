#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ops/lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
load_environment

failures=()

for service in postgres app caddy; do
  container_id="$(compose ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    failures+=("$service container is not running")
    continue
  fi
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
  if [[ "$status" != "healthy" && "$status" != "running" ]]; then
    failures+=("$service container status is $status")
  fi
done

disk_percent="$(df -P "$REPO_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if (( disk_percent >= ${DISK_CRITICAL_PERCENT:-90} )); then
  failures+=("host disk usage is ${disk_percent}%")
elif (( disk_percent >= ${DISK_WARNING_PERCENT:-80} )); then
  send_alert warning "Host disk usage is ${disk_percent}%." || true
fi

memory_percent="$(free | awk '/Mem:/ {printf("%.0f", ($3/$2)*100)}')"
if (( memory_percent >= ${MEMORY_WARNING_PERCENT:-85} )); then
  send_alert warning "Host memory usage is ${memory_percent}%." || true
fi

cpu_threshold="${CPU_WARNING_PERCENT:-85}"
while read -r name cpu memory; do
  cpu="${cpu%%%}"
  memory="${memory%%%}"
  cpu_whole="${cpu%.*}"
  if [[ "$cpu_whole" =~ ^[0-9]+$ ]] && (( cpu_whole >= cpu_threshold )); then
    send_alert warning "Container $name CPU usage is ${cpu}%; memory usage is ${memory}%." || true
  fi
done < <(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemPerc}}')

if ((${#failures[@]} > 0)); then
  message="$(IFS='; '; echo "${failures[*]}")"
  send_alert critical "$message" || true
  echo "$message" >&2
  exit 1
fi

echo "Container, CPU, memory, and disk checks passed."
