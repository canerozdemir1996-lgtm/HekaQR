#!/usr/bin/env bash
# Polls origin/main; if there are new commits, pulls, rebuilds, and restarts pm2.
# Intended to run from cron every few minutes (see scripts/install-auto-deploy-cron.sh).

set -euo pipefail

REPO_DIR="/home/gamedev/projects/qrCode"
BRANCH="main"
PM2_APP="qrcode"
LOCK_FILE="/tmp/qrcode-auto-deploy.lock"
LOG_FILE="$REPO_DIR/.auto-deploy.log"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

cd "$REPO_DIR"

git fetch origin "$BRANCH" >>"$LOG_FILE" 2>&1

LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
  exit 0
fi

log "Yeni commit bulundu: $LOCAL_HEAD -> $REMOTE_HEAD"

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "HATA: working tree temiz değil, deploy atlandı (commitlenmemiş değişiklik var)."
  exit 1
fi

if ! git pull --ff-only origin "$BRANCH" >>"$LOG_FILE" 2>&1; then
  log "HATA: git pull başarısız (fast-forward değil olabilir), deploy atlandı."
  exit 1
fi

log "Bağımlılıklar kuruluyor (npm ci)..."
if ! npm ci >>"$LOG_FILE" 2>&1; then
  log "HATA: npm ci başarısız, deploy durduruldu."
  exit 1
fi

log "Build alınıyor (npm run build)..."
if ! npm run build >>"$LOG_FILE" 2>&1; then
  log "HATA: build başarısız, pm2 restart edilmedi. Sunucu eski sürümde kalıyor."
  exit 1
fi

log "Build başarılı, pm2 restart ediliyor ($PM2_APP)..."
if ! pm2 restart "$PM2_APP" >>"$LOG_FILE" 2>&1; then
  log "HATA: pm2 restart başarısız."
  exit 1
fi

log "Deploy tamamlandı: $REMOTE_HEAD"
