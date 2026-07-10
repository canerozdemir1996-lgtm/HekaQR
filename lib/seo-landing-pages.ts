export type SeoLandingPageConfig = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  benefits: string[];
  steps: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedSlugs: string[];
};

export const seoLandingPages: Record<string, SeoLandingPageConfig> = {
  "qr-kod-olusturucu": {
    slug: "qr-kod-olusturucu",
    title: "QR Kod Oluşturucu | Dinamik ve Tasarımlı QR Kod | QR Publish",
    description: "URL, menü, kartvizit ve kampanya içerikleriniz için QR kod oluşturun; tasarımı yönetin ve performansını takip edin.",
    eyebrow: "QR Kod Oluşturucu",
    h1: "QR kodunuzu oluşturun, yayınlayın ve yönetin",
    intro: "QR Publish ile URL, menü, dijital kartvizit, Wi-Fi ve kampanya içerikleri için QR kod oluşturabilir; ihtiyacınıza göre tasarım ve yayın akışını tek panelden yönetebilirsiniz.",
    benefits: ["URL, menü, vCard ve iletişim akışları için farklı QR türleri", "Logo, renk ve stil seçenekleriyle tasarım kontrolü", "Dinamik QR kodlarda hedef ve içerik yönetimi"],
    steps: ["QR türünü ve içeriği seçin.", "Tasarımı markanıza göre düzenleyin.", "QR kodu yayınlayın, indirin ve paylaşın."],
    faqs: [
      { question: "QR kod oluşturmak ücretsiz mi?", answer: "QR Publish'te ücretsiz planla başlayabilir; ihtiyaçlarınıza göre planınızı daha sonra güncelleyebilirsiniz." },
      { question: "QR kodun tasarımını değiştirebilir miyim?", answer: "QR stüdyosunda renk, logo ve stil seçenekleriyle desteklenen QR kod tasarımlarını düzenleyebilirsiniz." },
      { question: "QR kodu yayınladıktan sonra yönetebilir miyim?", answer: "Dinamik QR akışlarında içerik ve yönlendirme kurallarını panelden yönetebilirsiniz." },
    ],
    relatedSlugs: ["dinamik-qr-kod-olusturucu", "ucretsiz-qr-kod-olusturucu", "qr-kod-analiz"],
  },
  "ucretsiz-qr-kod-olusturucu": {
    slug: "ucretsiz-qr-kod-olusturucu",
    title: "Ücretsiz QR Kod Oluşturucu | QR Publish",
    description: "Ücretsiz planla QR kod oluşturmaya başlayın; QR Publish ile QR tasarımı, yayınlama ve yönetim akışını deneyin.",
    eyebrow: "Ücretsiz QR Kod Oluşturucu",
    h1: "Ücretsiz QR kod oluşturmaya başlayın",
    intro: "İlk QR akışınızı oluşturmak için ücretsiz planla başlayın. QR Publish, içerik türünü seçme, QR tasarlama ve yayınlama sürecini tek yerde toplar.",
    benefits: ["Ücretsiz planla ilk QR akışını kurma", "URL, kartvizit ve iletişim senaryolarına uygun başlangıç seçenekleri", "Büyüyen kullanım için plan karşılaştırması"],
    steps: ["Ücretsiz hesabınızı oluşturun.", "İçeriğinize uygun QR türünü seçin.", "QR kodunuzu oluşturup paylaşın."],
    faqs: [
      { question: "Ücretsiz planda neler var?", answer: "Güncel limitler ve dahil olan özellikler Fiyatlandırma sayfasında gösterilir." },
      { question: "Daha sonra planımı yükseltebilir miyim?", answer: "Kullanım ihtiyacınız arttığında uygun bir üst pakete geçebilirsiniz." },
      { question: "Ücretsiz QR kodumu tasarlayabilir miyim?", answer: "Kullanabileceğiniz tasarım seçenekleri planınıza ve QR türünüze göre panelde gösterilir." },
    ],
    relatedSlugs: ["qr-kod-olusturucu", "dinamik-qr-kod-olusturucu", "vcard-qr-kod-olusturucu"],
  },
  "dinamik-qr-kod-olusturucu": {
    slug: "dinamik-qr-kod-olusturucu",
    title: "Dinamik QR Kod Oluşturucu | Düzenle ve Takip Et | QR Publish",
    description: "Dinamik QR kod oluşturun; QR kodunuzu yeniden basmadan içerik ve yönlendirme akışını panelden yönetin.",
    eyebrow: "Dinamik QR Kod",
    h1: "Dinamik QR kodunuzu oluşturun ve sonradan yönetin",
    intro: "Dinamik QR kodlar, yayınlanan QR görselini değiştirmeden desteklenen hedef ve içerik akışlarını yönetmenize yardımcı olur. Kampanya, menü ve basılı materyal çalışmalarında güncel kalmak için kullanabilirsiniz.",
    benefits: ["Yayın sonrası içerik ve yönlendirme yönetimi", "Kampanya ve basılı materyal için esnek QR akışı", "Tarama performansını izlemeye uygun yapı"],
    steps: ["Dinamik QR için içerik türünü seçin.", "Hedefi ve tasarımı ayarlayın.", "QR kodu yayınlayıp panelden yönetin."],
    faqs: [
      { question: "Dinamik QR kod nedir?", answer: "Dinamik QR, QR görseli sabit kalırken desteklenen hedef veya içerik ayarlarının panelden yönetilebildiği QR akışıdır." },
      { question: "Dinamik QR kod sonradan düzenlenir mi?", answer: "Desteklenen QR türlerinde içerik ve yönlendirme ayarları panelden güncellenebilir." },
      { question: "Dinamik QR kod taramalarını takip edebilir miyim?", answer: "Planınıza dahil raporlama özellikleriyle QR performansını takip edebilirsiniz." },
    ],
    relatedSlugs: ["qr-kod-takip", "qr-kod-analiz", "toplu-qr-kod-olusturma"],
  },
  "restoran-qr-menu": {
    slug: "restoran-qr-menu",
    title: "Restoran QR Menü Oluşturucu | Dijital Menü | QR Publish",
    description: "Restoranınız için QR menü oluşturun; kategori, ürün, görsel, indirim ve masa akışını tek panelden yönetin.",
    eyebrow: "Restoran QR Menü",
    h1: "Restoranınız için QR menü oluşturun",
    intro: "QR Publish ile restoran menünüzü QR kodla erişilebilir hale getirin. Menü içeriğini, kategorileri, ürün görsellerini ve desteklenen masa akışlarını panelden yönetebilirsiniz.",
    benefits: ["Kategori ve ürün bazlı dijital menü yönetimi", "Masa QR ve sipariş akışına uygun yapı", "Menü içeriğini güncelleyerek baskı bağımlılığını azaltma"],
    steps: ["Menü kategorilerinizi ve ürünlerinizi ekleyin.", "Menü görünümünü ve QR tasarımını düzenleyin.", "QR menüyü masalarda veya basılı materyallerde kullanın."],
    faqs: [
      { question: "QR menüye ürün görseli ekleyebilir miyim?", answer: "Menü QR akışında kategori ve ürün görsellerini desteklenen alanlardan yönetebilirsiniz." },
      { question: "Masa bazlı QR kullanabilir miyim?", answer: "Masa QR ve ilgili sipariş akışları QR Publish'in restoran kullanım senaryoları için sunulur." },
      { question: "Menüyü sonradan güncelleyebilir miyim?", answer: "Menü içeriğini panelden güncelleyerek QR menünüzü güncel tutabilirsiniz." },
    ],
    relatedSlugs: ["dinamik-qr-kod-olusturucu", "qr-kod-analiz", "toplu-qr-kod-olusturma"],
  },
  "pdf-qr-kod-olusturucu": {
    slug: "pdf-qr-kod-olusturucu",
    title: "PDF QR Kod Oluşturucu | QR Publish",
    description: "PDF dosyanızı veya paylaşılan PDF bağlantınızı QR kodla erişilebilir hale getirin ve kolayca paylaşın.",
    eyebrow: "PDF QR Kod",
    h1: "PDF içeriğiniz için QR kod oluşturun",
    intro: "Katalog, menü, sunum veya doküman bağlantınızı QR kodla paylaşın. QR Publish ile PDF içeriğine giden QR akışını tasarlayıp yayınlayabilirsiniz.",
    benefits: ["PDF ve doküman paylaşımına uygun QR akışı", "Basılı materyalden dijital dokümana hızlı erişim", "QR tasarımını markanıza göre düzenleme"],
    steps: ["PDF veya doküman bağlantınızı hazırlayın.", "QR kod türünü seçip bağlantıyı ekleyin.", "QR kodu indirin ve paylaşın."],
    faqs: [
      { question: "PDF için QR kod nasıl oluşturulur?", answer: "PDF bağlantınızı QR kod içeriği olarak ekleyip QR tasarımını tamamladıktan sonra yayınlayabilirsiniz." },
      { question: "PDF değişirse QR kodu tekrar basmak gerekir mi?", answer: "Dinamik QR akışının uygun olduğu senaryolarda hedef bağlantı yönetimi panelden yapılabilir." },
      { question: "PDF QR kodunu nerelerde kullanabilirim?", answer: "Katalog, menü, sunum, ürün bilgisi ve basılı materyal gibi doküman paylaşım senaryolarında kullanabilirsiniz." },
    ],
    relatedSlugs: ["qr-kod-olusturucu", "dinamik-qr-kod-olusturucu", "toplu-qr-kod-olusturma"],
  },
  "whatsapp-qr-kod-olusturucu": {
    slug: "whatsapp-qr-kod-olusturucu",
    title: "WhatsApp QR Kod Oluşturucu | QR Publish",
    description: "WhatsApp sohbet bağlantınız için QR kod oluşturun; müşterilerinizin size hızlıca ulaşmasını kolaylaştırın.",
    eyebrow: "WhatsApp QR Kod",
    h1: "WhatsApp sohbet bağlantınız için QR kod oluşturun",
    intro: "Müşterilerinizin işletmenizle WhatsApp üzerinden hızlıca iletişime geçmesi için sohbet bağlantınızı QR kodla paylaşın. QR tasarımını marka görünümünüze uyarlayın.",
    benefits: ["WhatsApp iletişim akışına hızlı erişim", "Mağaza, broşür ve etkinlik materyallerinde kullanıma uygun QR", "Tasarım ve yayınlama seçenekleri"],
    steps: ["WhatsApp iletişim bağlantınızı hazırlayın.", "Bağlantıyı QR içeriği olarak ekleyin.", "QR kodu oluşturup müşterilerinizle paylaşın."],
    faqs: [
      { question: "WhatsApp QR kodu ne işe yarar?", answer: "WhatsApp QR kodu, kullanıcıları sohbet başlatabilecekleri bağlantıya yönlendirmek için kullanılır." },
      { question: "Önceden yazılmış mesaj eklenebilir mi?", answer: "WhatsApp bağlantınız destekliyorsa, QR kodunuz bu bağlantıyı paylaşabilir." },
      { question: "WhatsApp QR kodunu nerede kullanabilirim?", answer: "Mağaza, etkinlik, basılı kampanya, kartvizit ve müşteri iletişimi alanlarında kullanabilirsiniz." },
    ],
    relatedSlugs: ["qr-kod-olusturucu", "vcard-qr-kod-olusturucu", "qr-kod-analiz"],
  },
  "vcard-qr-kod-olusturucu": {
    slug: "vcard-qr-kod-olusturucu",
    title: "vCard QR Kod Oluşturucu | Dijital Kartvizit | QR Publish",
    description: "Dijital kartvizitinizi vCard QR kodla paylaşın; iletişim bilgilerinizi mobil uyumlu profil sayfasında yayınlayın.",
    eyebrow: "vCard QR Kod",
    h1: "Dijital kartvizitinizi QR kodla paylaşın",
    intro: "QR Publish ile iletişim bilgilerinizi vCard ve mobil uyumlu profil sayfası olarak yayınlayın. QR kodu kartvizit, fuar standı veya ürün materyallerinde kullanabilirsiniz.",
    benefits: ["İletişim bilgilerini QR kodla paylaşma", "Mobil uyumlu dijital kartvizit profili", "Kurumsal kartvizit akışları için düzenlenebilir yapı"],
    steps: ["Kartvizit bilgilerinizi ekleyin.", "Profil görünümünü ve QR tasarımını düzenleyin.", "QR kodu paylaşın veya basılı materyale ekleyin."],
    faqs: [
      { question: "vCard QR kod nedir?", answer: "vCard QR kod, iletişim bilgilerini dijital kartvizit akışında paylaşmak için kullanılan QR koddur." },
      { question: "Kişiler QR kodla rehbere kaydedebilir mi?", answer: "vCard akışı, desteklenen cihazlarda iletişim bilgilerini kaydetmeye uygun bilgiler sunar." },
      { question: "Birden fazla kartvizit oluşturabilir miyim?", answer: "Kullanım kapasitesi seçtiğiniz plana ve QR yönetim ihtiyacınıza göre değişir." },
    ],
    relatedSlugs: ["qr-kod-olusturucu", "whatsapp-qr-kod-olusturucu", "toplu-qr-kod-olusturma"],
  },
  "toplu-qr-kod-olusturma": {
    slug: "toplu-qr-kod-olusturma",
    title: "Toplu QR Kod Oluşturma | QR Publish",
    description: "Çok sayıda QR kodu tek akışta oluşturun, tasarlayın ve yönetin; kampanya ve operasyon çalışmalarınızı hızlandırın.",
    eyebrow: "Toplu QR Kod Oluşturma",
    h1: "Çok sayıda QR kodu tek akışta oluşturun",
    intro: "Kampanya, ürün, masa veya ekip bazlı çok sayıda QR kod için toplu oluşturma akışını kullanın. QR Publish ile QR arşivinizi klasör ve tasarım seçenekleriyle yönetebilirsiniz.",
    benefits: ["Çok sayıda QR kodu birlikte oluşturma", "Klasör ve tasarım yönetimi", "Kampanya ve operasyon senaryoları için düzenli QR arşivi"],
    steps: ["QR içeriklerinizi hazırlayın.", "Toplu oluşturma akışında QR ayarlarını belirleyin.", "Sonuçları indirin veya panelden yönetin."],
    faqs: [
      { question: "Toplu QR kod oluşturma kimler için uygundur?", answer: "Ürün, kampanya, masa veya çoklu şube gibi çok sayıda QR gereken operasyonlar için uygundur." },
      { question: "Toplu QR kodlara aynı tasarımı uygulayabilir miyim?", answer: "Desteklenen tasarım ve şablon ayarlarını toplu QR iş akışında kullanabilirsiniz." },
      { question: "Toplu oluşturma planıma dahil mi?", answer: "Toplu oluşturma erişimi ve limitleri Fiyatlandırma sayfasında plan bazında gösterilir." },
    ],
    relatedSlugs: ["qr-kod-olusturucu", "dinamik-qr-kod-olusturucu", "qr-kod-analiz"],
  },
  "qr-kod-analiz": {
    slug: "qr-kod-analiz",
    title: "QR Kod Analiz ve Tarama İstatistikleri | QR Publish",
    description: "QR kod taramalarınızı analiz edin; QR Publish ile performansı QR, cihaz, konum ve tarih bazında takip edin.",
    eyebrow: "QR Kod Analiz",
    h1: "QR kod taramalarınızı analiz edin",
    intro: "QR Publish raporlarıyla QR kod performansını daha iyi anlayın. Tarama verilerini QR, klasör, cihaz, konum ve tarih gibi boyutlarda inceleyerek kampanyalarınızı değerlendirebilirsiniz.",
    benefits: ["QR ve klasör bazlı performans görünümü", "Cihaz, tarayıcı, ülke ve şehir kırılımları", "Tarih aralığına göre tarama eğilimleri"],
    steps: ["QR kodunuzu yayınlayın.", "Taramaları panelde izleyin.", "Verileri kampanya ve içerik kararlarında kullanın."],
    faqs: [
      { question: "QR kod analizi nedir?", answer: "QR kod analizi, QR taramalarından oluşan performans verilerini inceleme sürecidir." },
      { question: "Hangi QR istatistiklerini görebilirim?", answer: "Planınıza göre toplam ve tekil tarama ile cihaz, konum, tarayıcı ve tarih gibi kırılımları inceleyebilirsiniz." },
      { question: "Kampanya QR kodlarını karşılaştırabilir miyim?", answer: "QR ve klasör bazlı raporlama, kampanya performansını karşılaştırmanıza yardımcı olur." },
    ],
    relatedSlugs: ["qr-kod-takip", "dinamik-qr-kod-olusturucu", "toplu-qr-kod-olusturma"],
  },
  "qr-kod-takip": {
    slug: "qr-kod-takip",
    title: "QR Kod Takip Sistemi | Tarama Performansını İzleyin | QR Publish",
    description: "QR kodlarınızın tarama performansını takip edin; raporlarla kampanya ve içerik akışlarını daha bilinçli yönetin.",
    eyebrow: "QR Kod Takip",
    h1: "QR kodlarınızın performansını takip edin",
    intro: "QR kod takibi, yayınlanan QR kodların nasıl kullanıldığını anlamanıza yardımcı olur. QR Publish ile planınıza dahil raporlama araçlarını kullanarak tarama eğilimlerini takip edebilirsiniz.",
    benefits: ["Tarama eğilimlerini tarih aralığıyla izleme", "QR, klasör ve kampanya bazlı görünüm", "İçerik güncelleme kararlarını veriye dayandırma"],
    steps: ["QR kodunuzu yayınlayın.", "Tarama verilerini raporlardan takip edin.", "İçerik veya kampanya akışınızı değerlendirin."],
    faqs: [
      { question: "QR kod takibi nasıl çalışır?", answer: "QR kod yayınlandıktan sonra desteklenen tarama verileri panelde raporlanır." },
      { question: "QR kod takibi için dinamik QR gerekir mi?", answer: "Takip ve yönetim kapasitesi QR türüne ve planınıza göre değişir; dinamik QR akışları yönetilebilir hedefler için uygundur." },
      { question: "Tarama verilerini hangi amaçla kullanabilirim?", answer: "Kampanya, içerik, menü ve basılı materyal performansını değerlendirmek için kullanabilirsiniz." },
    ],
    relatedSlugs: ["qr-kod-analiz", "dinamik-qr-kod-olusturucu", "restoran-qr-menu"],
  },
};
