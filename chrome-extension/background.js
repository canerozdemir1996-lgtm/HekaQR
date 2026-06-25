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
  await chrome.action.openPopup();
});
