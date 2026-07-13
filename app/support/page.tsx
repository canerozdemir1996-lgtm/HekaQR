import SupportCenterClient from "@/components/SupportCenterClient";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListSchema, buildFaqPageSchema, buildPageMetadata, getCanonicalUrl } from "@/lib/seo";

const faqItems = [
  { question: "QR kod hedefini değiştirebilir miyim?", answer: "Dinamik QR akışlarında hedef ve içerik panelden güncellenebilir." },
  { question: "Menü QR siparişleri nerede görünür?", answer: "Siparişler sayfasında tarih, masa, durum ve ürün bazlı takip edilir." },
  { question: "Destek talebi nasıl oluşturulur?", answer: "Support sayfasındaki form üzerinden konu, kategori, açıklama ve öncelik bilgisiyle talep oluşturabilirsiniz." },
];

export const metadata = buildPageMetadata({
  title: "Destek Merkezi | QR Publish",
  description: "QR Publish yardım merkezi, popüler sorular, sistem durumu ve destek talebi oluşturma ekranı.",
  path: "/support",
});

export default function SupportPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "ContactPage", name: "QR Publish Destek Merkezi", url: getCanonicalUrl("/support") },
            buildFaqPageSchema(faqItems),
            buildBreadcrumbListSchema([
              { name: "Ana sayfa", path: "/" },
              { name: "Destek Merkezi", path: "/support" },
            ]),
          ],
        }}
      />
      <SupportCenterClient />
    </>
  );
}
