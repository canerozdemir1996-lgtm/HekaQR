# QR Hub Kurulum Rehberi

## Önce eski config dosyalarını temizle

Proje klasöründe şu komutları çalıştır:

```bash
# Eski/çakışan config dosyalarını sil
rm -f postcss.config.mjs
rm -f postcss.config.js  
rm -f tailwind.config.ts
rm -f tailwind.config.js
rm -f next.config.ts
rm -f next.config.js
rm -f next.config.mjs

# Sonra zip'teki yeni dosyaları kopyala
cp -r qr-fix/* .

# node_modules temizle ve yeniden kur
rm -rf node_modules .next
npm install

# Çalıştır
npm run dev
```
