#!/usr/bin/env bash
# Free plandaki kullanıcıların 30 günden eski scan_logs kayıtlarını siler
# (migrations/monthly_scan_limits.sql > cleanup_free_plan_scan_logs()).
# Starter/Pro/Enterprise'a dokunmaz (sınırsız saklama).
# Cron'dan günlük çalıştırılır: scripts/install-scan-log-cleanup-cron.sh

set -euo pipefail

REPO_DIR="/home/gamedev/projects/qrCode"
LOCK_FILE="/tmp/qrcode-scan-log-cleanup.lock"
LOG_FILE="$REPO_DIR/.scan-log-cleanup.log"
ENV_FILE="$REPO_DIR/.env.local"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: $ENV_FILE bulunamadı"
  exit 1
fi

SUPABASE_URL=$(grep -m1 '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
SERVICE_KEY=$(grep -m1 '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2-)

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  log "ERROR: SUPABASE_URL veya SERVICE_KEY .env.local'da bulunamadı"
  exit 1
fi

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/cleanup_free_plan_scan_logs" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

log "cleanup_free_plan_scan_logs sonucu: $RESPONSE"
