#!/usr/bin/env bash
# Doğrulanmış bir müşteri custom domain'i için nginx server block oluşturur
# ve certbot ile TLS sertifikası alır. Idempotent: domain için config/
# sertifika zaten varsa certbot/nginx bunu kendi içinde no-op'a çevirir.
#
# Sadece DNS TXT kaydıyla sahipliği doğrulanmış domainler için çağrılmalı —
# bu doğrulama lib/domains/serverProvision.ts -> bu script'i tetikleyen
# app/api/v1/custom-domains/[id]/verify/route.ts içinde yapılıyor.
#
# Root yetkisi gerektirir (nginx config + certbot). Kurulum talimatı için
# bkz. README/MVP_BACKEND_RAPORU.txt — gamedev kullanıcısına bu script için
# NOPASSWD sudo izni verilmesi gerekiyor.
#
# Kullanım: sudo provision-custom-domain.sh <domain>

set -euo pipefail

DOMAIN="${1:-}"
APP_PORT=3001
EMAIL="${CERTBOT_EMAIL:-admin@qrpublish.app}"

if [[ -z "$DOMAIN" ]]; then
  echo "Kullanım: $0 <domain>" >&2
  exit 1
fi

# Savunma amaçlı: domain formatını burada da doğrula — bu script root
# yetkisiyle çalıştığı için çağıran taraf (API) güvenilir olsa da burada
# ikinci bir kontrol katmanı bulunuyor.
if ! [[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$ ]]; then
  echo "Geçersiz domain formatı: $DOMAIN" >&2
  exit 1
fi

SITE_NAME="custom-${DOMAIN}"
AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"

if [[ ! -f "$AVAILABLE" ]]; then
  cat > "$AVAILABLE" <<NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
fi

ln -sf "$AVAILABLE" "$ENABLED"

nginx -t
systemctl reload nginx

# certbot --nginx, server_name'i eşleşen bloğu bulup SSL server block'unu
# ve 80->443 redirect'i otomatik ekler (bu sunucudaki nip.io sitesindeki
# "managed by Certbot" blokları aynı şekilde oluşturulmuştu).
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect -m "$EMAIL"

nginx -t
systemctl reload nginx

echo "OK: ${DOMAIN} provisioned"
