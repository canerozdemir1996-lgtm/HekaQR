const input = document.getElementById("url-input");
const qrImage = document.getElementById("qr-image");
const placeholder = document.getElementById("placeholder");
const downloadBtn = document.getElementById("download-btn");
const editLink = document.getElementById("edit-link");

let debounceTimer = null;

function render(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    qrImage.hidden = true;
    placeholder.hidden = false;
    downloadBtn.hidden = true;
    editLink.hidden = true;
    return;
  }

  getApiOrigin().then((origin) => {
    const src = `${origin}/api/v1/qr/instant?data=${encodeURIComponent(trimmed)}&format=png&size=300`;
    qrImage.src = src;
    qrImage.hidden = false;
    placeholder.hidden = true;
    downloadBtn.hidden = false;
    editLink.hidden = false;
    editLink.href = `${origin}/dashboard/qrcodes/new?url=${encodeURIComponent(trimmed)}`;
  });
}

input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => render(input.value), 250);
});

downloadBtn.addEventListener("click", async () => {
  const trimmed = input.value.trim();
  if (!trimmed) return;
  const origin = await getApiOrigin();
  const url = `${origin}/api/v1/qr/instant?data=${encodeURIComponent(trimmed)}&format=png&size=1000`;
  chrome.downloads.download({ url, filename: "qr-publish.png" });
});

(async () => {
  const session = await chrome.storage.session.get("lastTargetUrl");
  if (session.lastTargetUrl) {
    input.value = session.lastTargetUrl;
    await chrome.storage.session.remove("lastTargetUrl");
    render(session.lastTargetUrl);
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:\/\//.test(tab.url)) {
      input.value = tab.url;
      render(tab.url);
    }
  } catch {
    // activeTab izni yoksa veya özel bir sayfadaysa sessizce atla
  }
})();
