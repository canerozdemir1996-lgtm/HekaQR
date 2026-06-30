# QR Publish Chrome Eklentisi

Herhangi bir sayfayı veya bağlantıyı sağ tıklayıp anında QR koduna çevirir.

## Yerel test (paket yüklemeden)

1. Chrome'da `chrome://extensions` adresine gidin.
2. Sağ üstten "Geliştirici modu"nu açın.
3. "Paketlenmemiş öğe yükle" (Load unpacked) butonuna basın.
4. Bu klasörü (`chrome-extension/`) seçin.

## Kullanım

- Bir sayfada veya bağlantı üzerinde sağ tıklayıp **"Bu sayfayı/bağlantıyı QR koduna çevir"** seçeneğini kullanın.
- Veya araç çubuğundaki ikona tıklayıp herhangi bir metin/link yapıştırın.
- **PNG İndir** ile anında indirin, ya da **"QR Publish'te dinamik QR'a çevir"** ile panelde düzenlemeye devam edin.

## Uyumluluk

- Minimum Chrome sürümü: 109.
- Chrome 127 ve üzeri sürümlerde sağ tık menüsü eklenti popup'ını açar.
- Daha eski desteklenen Chrome sürümlerinde aynı işlem QR Publish panelinde yeni QR oluşturma ekranını açar.

## Chrome Web Store'a yayınlama

Bu adımlar harici bir Google hesabı/ödeme gerektirir, bu yüzden koddan ayrı tutuldu:

1. https://chrome.google.com/webstore/devconsole adresinden bir geliştirici hesabı açın (tek seferlik ~5$ kayıt ücreti).
2. Bu klasörü zip'leyin: `cd chrome-extension && zip -r ../qr-publish-extension.zip .`
3. Developer Dashboard'dan "New item" ile zip'i yükleyin, mağaza listesi bilgilerini (açıklama, ekran görüntüleri, gizlilik politikası linki — `/privacy-policy` sayfanızı kullanabilirsiniz) doldurun.
4. İnceleme genelde birkaç gün sürer.

## Alan adı notu

`config.js` içindeki `QR_PUBLISH_DEFAULT_ORIGIN`, QR Publish public origin değerine
işaret eder. Ortam/domain değiştiğinde bu değeri ve `manifest.json > host_permissions`
listesini birlikte güncelleyin.
