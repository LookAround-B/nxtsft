#!/usr/bin/env bash
# Calls one /api/cron/<route> on the local app with the CRON_SECRET bearer.
# Usage: cron.sh daily-report
set -euo pipefail
SECRET=$(grep -E '^CRON_SECRET=' /var/www/nxtsft/shared/.env | cut -d= -f2- | tr -d '"')
curl -fsS --max-time 280 -H "Authorization: Bearer $SECRET" \
  "http://127.0.0.1:3000/api/cron/$1" >/dev/null
