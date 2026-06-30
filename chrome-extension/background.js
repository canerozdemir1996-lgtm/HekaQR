importScripts("config.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "qr-publish-link",
    title: "Bu bağlantıyı QR koduna çevir",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: "qr-publish-page",
    title: "Bu sayfayı QR koduna çevir",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const target = info.menuItemId === "qr-publish-link" ? info.linkUrl : info.pageUrl;
  if (!target) return;

  await chrome.storage.session.set({ lastTargetUrl: target });

  try {
    if (chrome.action.openPopup) {
      await chrome.action.openPopup();
      return;
    }
  } catch (error) {
    console.warn("Popup acilamadi, QR Publish paneli aciliyor.", error);
  }

  await chrome.storage.session.remove("lastTargetUrl");
  const origin = await getApiOrigin();
  await chrome.tabs.create({
    url: `${origin}/dashboard/qrcodes/new?url=${encodeURIComponent(target)}`,
  });
});
