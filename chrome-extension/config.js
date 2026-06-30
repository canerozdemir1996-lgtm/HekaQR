// QR Publish public origin. Ortam değiştiğinde manifest.json'daki
// host_permissions ile birlikte güncelleyin.
const QR_PUBLISH_DEFAULT_ORIGIN = "https://qr.158.220.106.172.nip.io";

async function getApiOrigin() {
  const stored = await chrome.storage.sync.get("apiOrigin");
  return stored.apiOrigin || QR_PUBLISH_DEFAULT_ORIGIN;
}
