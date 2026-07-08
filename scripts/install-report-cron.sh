#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_SCHEDULE="${ADMIN_REPORT_CRON_SCHEDULE:-5 0 * * *}"
LOG_FILE="${ADMIN_REPORT_LOG_FILE:-/tmp/auraxpress-usage-report.log}"
COMMAND="cd ${PROJECT_ROOT} && /usr/bin/env npm run report:daily >> ${LOG_FILE} 2>&1"
CRON_ENTRY="${CRON_SCHEDULE} ${COMMAND}"

tmp_file="$(mktemp)"
crontab -l 2>/dev/null | grep -Fv "npm run report:daily" > "${tmp_file}" || true
printf '%s\n' "${CRON_ENTRY}" >> "${tmp_file}"
crontab "${tmp_file}"
rm -f "${tmp_file}"

echo "Installed cron entry:"
echo "${CRON_ENTRY}"
