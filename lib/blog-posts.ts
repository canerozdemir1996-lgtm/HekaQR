export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  keywords: string[];
  sections: BlogSection[];
  faq: Array<{ question: string; answer: string }>;
  relatedPaths: Array<{ label: string; path: string }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "qr-kod-rehberi",
    title: "QR Kod Rehberi: Oluşturma, Tasarım ve Ölçüm",
    description: "QR kod oluşturma, statik ve dinamik QR seçimi, tasarım, baskı, güvenlik ve tarama analizi süreçlerini tek kapsamlı rehberde öğrenin.",
    excerpt: "QR kod fikrinden baskı ve performans ölçümüne kadar doğru kararları sırayla veren kapsamlı başlangıç rehberi.",
    category: "QR Kod Rehberleri",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 14,
    keywords: ["QR kod rehberi", "QR kod oluşturma", "QR kod nasıl yapılır", "QR kod tasarımı"],
    sections: [
      { heading: "QR kod projesine hedefle başlayın", paragraphs: ["İyi bir QR kod çalışması desen üretmekle değil, tarama sonrasında kullanıcının yapmasını istediğiniz eylemi tanımlamakla başlar. Menü görüntüleme, iletişim bilgisi kaydetme, kampanya sayfasını açma veya doküman indirme gibi tek bir ana hedef seçin.", "Kodun yerleştirileceği ortamı da baştan belirleyin. Kartvizit, masa kartı, ürün ambalajı ve açık hava afişi farklı tarama mesafeleri, ışık koşulları ve içerik beklentileri oluşturur."], bullets: ["Tek bir ana kullanıcı eylemi belirleyin", "Baskı yüzeyini ve tarama mesafesini not edin", "Hedef sayfanın mobil deneyimini önceden kontrol edin"] },
      { heading: "Statik mi dinamik mi seçilmeli?", paragraphs: ["Statik QR kodda veri desenin içine doğrudan yazılır. Bilgi değişmeyecekse, yönlendirme veya raporlama gerekmiyorsa basit ve bağımsız bir çözümdür.", "Dinamik QR kod yönetilebilir bir kısa adres kullanır. Hedefi baskıyı değiştirmeden güncelleme, kampanya taramalarını izleme veya farklı kurallar uygulama ihtiyacında daha uygundur. Hizmet sürekliliği gerektiği için sağlayıcı ve plan koşulları da kararın parçasıdır."] },
      { heading: "İçerik türünü doğru yapılandırın", paragraphs: ["Web bağlantılarında kısa ve güvenilir bir HTTPS hedefi kullanın. vCard içeriğinde yalnızca paylaşılması gereken güncel iletişim alanlarını ekleyin. Wi-Fi kodlarında ağ adı ve güvenlik türünü doğru seçin.", "Restoran menüsü veya katalog gibi değişken içeriklerde ağır bir dosya yerine hızlı açılan, erişilebilir bir mobil sayfa daha iyi kullanıcı deneyimi sunabilir."] },
      { heading: "Tasarım okunabilirliğe hizmet etmeli", paragraphs: ["Kod ile arka plan arasında güçlü kontrast bırakın ve çevresindeki sessiz alanı koruyun. Renk ve logo marka bütünlüğü sağlayabilir; ancak veri noktalarını kapatmamalı veya kameranın deseni ayırt etmesini zorlaştırmamalıdır.", "Desen yoğunluğu içerik uzunluğu ve hata düzeltme seviyesiyle artar. Özellikle küçük baskılarda gereksiz uzun hedefler yerine kısa yönlendirmeler kullanmak okunabilirliği destekler."] },
      { heading: "Baskı öncesi gerçek koşullarda test edin", paragraphs: ["Ekrandaki önizleme baskı testi değildir. Dosyayı nihai boyutta örnek olarak basın; farklı telefonlarla, farklı açılardan ve kullanılacağı mekânın ışığında tarayın.", "Kıvrımlı ambalaj, parlak yüzey, düşük ışık veya uzun mesafe sonuçları değiştirebilir. Büyük adetli üretimden önce prova baskısı yapmak yeniden baskı maliyetini azaltır."], bullets: ["En az iki farklı telefonla deneyin", "Hedef URL ve HTTPS durumunu kontrol edin", "Zayıf ışık ve eğik açı testi yapın", "Baskının çevresinde açıklayıcı çağrı metni kullanın"] },
      { heading: "Yayın sonrası performansı ölçün", paragraphs: ["Başarıyı yalnızca toplam taramayla değerlendirmeyin. Dağıtım noktası, yayın süresi, saat dağılımı ve hedef sayfadaki dönüşüm birlikte yorumlanmalıdır.", "Kampanya bağlantılarında tutarlı UTM parametreleri kullanmak, QR ziyaretlerini web analitiğinde diğer kaynaklardan ayırmaya yardım eder. Kişisel verileri gereksiz toplamadan toplulaştırılmış eğilimlere odaklanın."] },
      { heading: "Bakım ve güncelleme planı oluşturun", paragraphs: ["Basılı QR kod uzun süre dolaşımda kalabilir. Hedef içeriğin sahibi, bağlantı kontrol sıklığı ve kampanya bitiminde gösterilecek sayfa önceden belirlenmelidir.", "Dinamik hedefler değiştirildiğinde eski ve yeni akışları tekrar test edin. İçeriğin güncelleme tarihini ve önemli değişiklikleri kayıt altında tutmak operasyonel hataları azaltır."] },
    ],
    faq: [{ question: "QR kod oluşturmak için hangi bilgi gerekir?", answer: "Kullanım amacına göre hedef URL, iletişim bilgisi, Wi-Fi bilgisi veya paylaşılacak metin gerekir. Baskı ortamı ve ölçüm ihtiyacı da statik-dinamik seçimini belirler." }, { question: "QR kodu yayımlamadan önce en önemli test nedir?", answer: "Kodu gerçek baskı boyutunda, kullanılacağı ışık ve mesafede birden fazla telefonla taramak; ardından hedef sayfanın doğru ve mobil uyumlu olduğunu kontrol etmektir." }, { question: "QR kod performansı nasıl artırılır?", answer: "Görünür yerleşim, açıklayıcı çağrı metni, güvenilir tarama tasarımı ve hızlı bir hedef sayfa birlikte iyileştirilmelidir." }],
    relatedPaths: [{ label: "QR kod oluşturucu", path: "/qr-kod-olusturucu" }, { label: "Dinamik QR kod oluşturucu", path: "/dinamik-qr-kod-olusturucu" }, { label: "QR kod analiz", path: "/qr-kod-analiz" }],
  },
  {
    slug: "qr-kod-nedir-nasil-calisir",
    title: "QR Kod Nedir ve Nasıl Çalışır? Başlangıç Rehberi",
    description: "QR kodların nasıl çalıştığını, hangi bilgi türlerini taşıdığını ve güvenilir bir QR kod hazırlarken nelere dikkat edilmesi gerektiğini öğrenin.",
    excerpt: "QR kod teknolojisini, statik ve dinamik yapıların farkını ve doğru kullanım adımlarını sade bir dille öğrenin.",
    category: "QR Kod Rehberleri",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 7,
    keywords: ["QR kod nedir", "QR kod nasıl çalışır", "QR kod oluşturma"],
    sections: [
      { heading: "QR kod nedir?", paragraphs: ["QR kod, metin veya bağlantı gibi verileri iki boyutlu siyah-beyaz bir desen içinde saklayan optik bir işarettir. Telefon kamerası kodu okur, deseni veriye çevirir ve kullanıcıya ilgili işlemi sunar.", "Klasik barkod yalnızca tek yönde okunurken QR kod iki yönde veri taşıdığı için daha fazla bilgi barındırabilir. URL, Wi-Fi bilgisi, iletişim kartı ve kısa metin en yaygın kullanım alanlarıdır."] },
      { heading: "Statik ve dinamik QR kod farkı", paragraphs: ["Statik QR kodda hedef bilgi doğrudan desenin içindedir; yayımlandıktan sonra değiştirilmesi yeni bir kod üretmeyi gerektirir. Dinamik QR kod ise yönetilebilir kısa bir adres üzerinden hedefe yönlendirir.", "Basılı materyalde hedefi sonradan değiştirmek veya taramaları ölçmek gerekiyorsa dinamik yapı daha uygundur. Tek seferlik, değişmeyecek bilgilerde statik kod yeterli olabilir."], bullets: ["Değişmeyecek bilgi için statik QR", "Yönetim ve ölçüm gereken kampanyalar için dinamik QR", "Her iki türde de baskı öncesi gerçek cihaz testi"] },
      { heading: "İyi bir QR kod nasıl hazırlanır?", paragraphs: ["Kod ile arka plan arasında güçlü kontrast bırakın, kodun çevresindeki boş alanı koruyun ve baskı boyutunu kullanım mesafesine göre seçin. Logo veya renk kullanıyorsanız okunabilirliği farklı telefonlarla sınayın.", "Hedef sayfanın mobil uyumlu ve hızlı olması da kod kadar önemlidir. Kullanıcı taramadan sonra ne göreceğini yakınındaki kısa bir açıklamadan anlayabilmelidir."] },
    ],
    faq: [{ question: "QR kod internet olmadan çalışır mı?", answer: "Metin veya Wi-Fi bilgisi gibi doğrudan kodlanan veriler okunabilir; bir web bağlantısını açmak için internet gerekir." }, { question: "QR kodun süresi dolar mı?", answer: "Statik kodun kendisi süresizdir. Dinamik kodun çalışması ise yönlendirme hizmetinin ve hesabın durumuna bağlıdır." }],
    relatedPaths: [{ label: "QR kod oluşturucu", path: "/qr-kod-olusturucu" }, { label: "Dinamik QR kod rehberi", path: "/blog/dinamik-qr-kod-nedir" }],
  },
  {
    slug: "dinamik-qr-kod-nedir",
    title: "Dinamik QR Kod Nedir? Avantajları ve Kullanımı",
    description: "Dinamik QR kodun ne olduğunu, statik QR koddan farklarını, hedef değiştirme ve tarama analizi gibi avantajlarını örneklerle inceleyin.",
    excerpt: "Hedefi yeniden baskı yapmadan değiştirmek ve tarama performansını ölçmek için dinamik QR kod kullanımını keşfedin.",
    category: "Dinamik QR",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 6,
    keywords: ["dinamik QR kod", "dinamik QR kod nedir", "QR kod değiştirme"],
    sections: [
      { heading: "Dinamik QR kod nasıl çalışır?", paragraphs: ["Dinamik QR kod, doğrudan nihai hedef yerine yönetilebilir bir yönlendirme adresi içerir. Kod tarandığında sistem güncel hedefi bulur ve ziyaretçiyi oraya gönderir.", "Bu ara katman sayesinde basılı kod değişmeden hedef bağlantı güncellenebilir. Menü, kampanya ve ürün dokümanı gibi sık değişen içeriklerde yeniden baskı ihtiyacını azaltır."] },
      { heading: "Hangi avantajları sağlar?", paragraphs: ["Dinamik yapı yalnızca hedef değiştirmek için değil, tarama eğilimlerini anlamak için de kullanılabilir. Tarih, cihaz ve kampanya bazındaki veriler içerik kararlarını destekler."], bullets: ["Hedef bağlantıyı panelden güncelleme", "Tarama performansını dönemsel izleme", "Kampanyaları tek QR üzerinden sürdürme", "Hatalı bağlantıyı yeni baskı olmadan düzeltme"] },
      { heading: "Ne zaman tercih edilmeli?", paragraphs: ["Afiş, ambalaj, masa kartı veya katalog uzun süre kullanılacaksa; arkasındaki içerik değişebilecekse dinamik QR tercih edin. Kişisel Wi-Fi şifresi gibi değişmeyecek ve ölçüm gerektirmeyen bilgilerde statik QR daha basittir.", "Yayımlamadan önce yönlendirme hedefini, mobil sayfayı ve kodun farklı ışık koşullarındaki okunabilirliğini test edin."] },
    ],
    faq: [{ question: "Dinamik QR kod sonradan düzenlenebilir mi?", answer: "Desteklenen hedef ve yönlendirme ayarları panelden güncellenebilir; basılmış QR görseli aynı kalır." }, { question: "Dinamik QR kod taramaları ölçülebilir mi?", answer: "Kullanılan platformun sunduğu raporlama özelliklerine göre tarama eğilimleri izlenebilir." }],
    relatedPaths: [{ label: "Dinamik QR kod oluşturucu", path: "/dinamik-qr-kod-olusturucu" }, { label: "QR kod takip rehberi", path: "/blog/qr-kod-takip-ve-analiz" }],
  },
  {
    slug: "restoran-qr-menu-hazirlama-rehberi",
    title: "Restoran QR Menü Nasıl Hazırlanır? Adım Adım Rehber",
    description: "Restoranınız için mobil uyumlu QR menü hazırlama, kategori düzenleme, masa kartı tasarımı ve baskı öncesi test adımlarını öğrenin.",
    excerpt: "Okunabilir, güncellenebilir ve müşterinin telefonda rahat kullanabileceği bir restoran QR menüsü hazırlayın.",
    category: "Restoran QR Menü",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 8,
    keywords: ["restoran QR menü", "QR menü hazırlama", "dijital menü"],
    sections: [
      { heading: "Menü içeriğini hazırlayın", paragraphs: ["Önce kategori, ürün adı, açıklama, fiyat ve varsa alerjen bilgilerini düzenleyin. Menüde müşterinin karar vermesine yardım etmeyen uzun metinlerden kaçının.", "Görseller kullanılıyorsa dosyaları sıkıştırın ve aynı görsel oranını koruyun. Böylece sayfa daha hızlı açılır ve ürün listesi daha düzenli görünür."] },
      { heading: "Mobil deneyimi önceliklendirin", paragraphs: ["QR menü çoğunlukla telefonda açılır. Yazılar kolay okunmalı, kategori geçişleri belirgin olmalı ve dokunma alanları yeterince büyük tasarlanmalıdır."], bullets: ["Fiyatları ürün adından kolay ayrıştırın", "Tükenen ürünleri gizleyin veya açıkça işaretleyin", "Menüyü ağır PDF yerine mobil sayfa olarak sunmayı değerlendirin", "Dil seçimini görünür bir konuma yerleştirin"] },
      { heading: "Masa kartını test edin", paragraphs: ["QR kodu kartın kenarına sıkıştırmayın; çevresinde boş alan bırakın. Parlak yüzeylerde yansıma oluşabileceği için mat baskı çoğu ortamda daha güvenilir sonuç verir.", "Kartları çoğaltmadan önce farklı telefonlarla, oturma mesafesinden ve restoranın gerçek ışığında tarama testi yapın."] },
    ],
    faq: [{ question: "QR menü sonradan güncellenebilir mi?", answer: "Dinamik menü yapısında ürün, fiyat ve kategori bilgileri aynı QR kod korunarak panelden güncellenebilir." }, { question: "QR menü için uygulama gerekir mi?", answer: "Standart QR kodlar telefon kamerasıyla açılabilir; müşterinin özel bir uygulama yüklemesi gerekmez." }],
    relatedPaths: [{ label: "Restoran QR menü çözümü", path: "/restoran-qr-menu" }, { label: "Restoran kullanım alanları", path: "/kullanim-alanlari/restoranlar" }],
  },
  {
    slug: "qr-kod-takip-ve-analiz",
    title: "QR Kod Takibi ve Tarama Analizi Nasıl Yapılır?",
    description: "QR kod taramalarını ölçerken hangi metriklerin anlamlı olduğunu, UTM kullanımını ve kampanya sonuçlarını doğru yorumlama yöntemlerini öğrenin.",
    excerpt: "Tarama sayısından cihaz dağılımına kadar QR kampanyalarında izlenmesi gereken temel ölçümleri öğrenin.",
    category: "QR Analizi",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 7,
    keywords: ["QR kod takip", "QR kod analiz", "QR tarama sayısı"],
    sections: [
      { heading: "Hangi QR metrikleri izlenir?", paragraphs: ["Toplam tarama tek başına yeterli değildir. Benzersiz ziyaret eğilimi, gün ve saat dağılımı, cihaz türü ve kampanya hedefindeki dönüşüm birlikte değerlendirilmelidir.", "Bir kampanyayı önceki dönemle karşılaştırırken baskı adedi, dağıtım noktası ve yayın süresi gibi koşulların değişip değişmediğini not edin."] },
      { heading: "UTM parametreleri neden önemlidir?", paragraphs: ["QR hedef bağlantısına eklenen UTM parametreleri, ziyaretin web analitik aracında doğru kampanya ve kaynak altında görünmesini sağlar. Her baskı veya kanal için tutarlı bir adlandırma sistemi kullanın."], bullets: ["utm_source ile temas noktasını belirtin", "utm_medium için qr gibi tutarlı bir değer kullanın", "utm_campaign değerini kampanya adıyla eşleştirin"] },
      { heading: "Veriyi eyleme dönüştürün", paragraphs: ["Tarama yoğunluğunun düşük olduğu bir noktada önce kodun görünürlüğünü ve okunabilirliğini kontrol edin. Tarama yüksek, hedef dönüşümü düşükse açılış sayfasının hızı, mesajı ve çağrı butonu incelenmelidir.", "Kişisel verileri gereksiz yere toplamadan, toplulaştırılmış eğilimlerle içerik ve dağıtım kararlarını iyileştirin."] },
    ],
    faq: [{ question: "Statik QR kod takip edilebilir mi?", answer: "Doğrudan hedefi içeren statik kod kendi başına tarama verisi üretmez; bağlantı tarafında ayrı analitik kullanılabilir." }, { question: "QR kod analizi için UTM zorunlu mu?", answer: "Zorunlu değildir ancak web analitiğinde kampanya kaynağını ayırmayı kolaylaştırır." }],
    relatedPaths: [{ label: "QR kod analiz özellikleri", path: "/qr-kod-analiz" }, { label: "QR kod takip çözümü", path: "/qr-kod-takip" }],
  },
  {
    slug: "vcard-qr-kod-dijital-kartvizit",
    title: "vCard QR Kod ile Dijital Kartvizit Nasıl Oluşturulur?",
    description: "İletişim bilgilerini telefona kaydetmeyi kolaylaştıran vCard QR kodların nasıl hazırlandığını ve dijital kartvizitte dikkat edilmesi gerekenleri öğrenin.",
    excerpt: "İsim, telefon, e-posta ve şirket bilgilerini tek taramayla paylaşan vCard QR kodunuzu doğru hazırlayın.",
    category: "Dijital Kartvizit",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 5,
    keywords: ["vCard QR kod", "dijital kartvizit", "kartvizit QR kod"],
    sections: [
      { heading: "vCard QR kod nedir?", paragraphs: ["vCard QR kod, ad, telefon, e-posta, şirket ve web sitesi gibi iletişim alanlarını standart bir kartvizit biçiminde taşır. Kullanıcı kodu taradığında bilgileri kişi listesine kaydetme seçeneği görür.", "Basılı kartvizitteki küçük yazıları tek tek girmek yerine bilgilerin doğrudan telefona aktarılmasını kolaylaştırır."] },
      { heading: "Hangi bilgiler eklenmeli?", paragraphs: ["Yalnızca paylaşmak istediğiniz güncel iş bilgilerini ekleyin. Birden fazla telefon veya e-posta kullanmak kartı gereksiz karmaşık hale getirebilir."], bullets: ["Ad ve soyad", "Görev ve şirket", "İş telefonu ve e-posta", "Kurumsal web sitesi", "Gerekliyse adres"] },
      { heading: "Yayınlamadan önce kontrol", paragraphs: ["Türkçe karakterlerin doğru göründüğünü, telefonun ülke koduyla kaydedildiğini ve e-posta adresinin yazımını kontrol edin. QR kodu hem iOS hem Android cihazlarda deneyin.", "İletişim bilgileriniz sık değişiyorsa yönetilebilir dijital kartvizit sayfasına yönlenen dinamik QR daha esnek olabilir."] },
    ],
    faq: [{ question: "vCard QR kod için internet gerekir mi?", answer: "Bilgi doğrudan QR kodun içindeyse kaydetme işlemi internet olmadan yapılabilir; çevrimiçi profil bağlantıları internet gerektirir." }, { question: "vCard QR kod kartvizite basılabilir mi?", answer: "Evet. Yeterli boyut, kontrast ve boş alan bırakılarak kartvizitte kullanılabilir." }],
    relatedPaths: [{ label: "vCard QR kod oluşturucu", path: "/vcard-qr-kod-olusturucu" }, { label: "Ücretsiz QR kod oluşturucu", path: "/ucretsiz-qr-kod-olusturucu" }],
  },
  {
    slug: "qr-kod-baski-boyutu-ve-kalite",
    title: "QR Kod Baskı Boyutu ve Kalitesi: Okunabilirlik Rehberi",
    description: "QR kod baskısında doğru boyut, kontrast, boş alan, malzeme ve test yöntemlerini öğrenerek tarama sorunlarını baskıdan önce önleyin.",
    excerpt: "Afişten kartvizite kadar QR kodun güvenilir taranması için boyut, kontrast ve baskı kontrol listesini uygulayın.",
    category: "QR Tasarımı",
    publishedAt: "2026-07-14",
    updatedAt: "2026-07-14",
    readingMinutes: 6,
    keywords: ["QR kod baskı boyutu", "QR kod kalitesi", "QR kod okunmuyor"],
    sections: [
      { heading: "Boyutu kullanım mesafesine göre seçin", paragraphs: ["QR kod için tek bir evrensel baskı boyutu yoktur. Kartvizitte yakından, afişte ise daha uzaktan tarama yapılır; kod büyüklüğü bu mesafeye göre artırılmalıdır.", "İçerik miktarı arttıkça desen yoğunlaşır. Kısa bağlantı kullanmak daha sade ve baskıya dayanıklı bir desen oluşturabilir."] },
      { heading: "Kontrast ve boş alanı koruyun", paragraphs: ["Koyu kod ile açık arka plan en güvenilir seçenektir. Ters renk, düşük kontrast veya desenli zeminler bazı kameralarda okumayı zorlaştırır."], bullets: ["Kod çevresindeki sessiz alanı kapatmayın", "Logoyu veri noktalarının büyük bölümünü örtecek kadar büyütmeyin", "Parlak ve kıvrımlı yüzeylerde gerçek malzemeyle test yapın", "Ekran görüntüsü yerine yüksek çözünürlüklü çıktı kullanın"] },
      { heading: "Baskı öncesi test listesi", paragraphs: ["Nihai dosyayı gerçek baskı ölçüsünde çıkarın. En az iki farklı telefon, farklı kamera açıları ve mekânın gerçek ışık koşullarıyla test edin.", "Kod okunuyor olsa bile hedef bağlantının doğru, güvenli ve mobil uyumlu olduğunu doğrulayın. Büyük baskı adedine geçmeden önce küçük bir prova baskısı alın."] },
    ],
    faq: [{ question: "QR kod neden bulanık okunmaz?", answer: "Düşük çözünürlük, yetersiz kontrast, küçük boyut veya baskıda dağılan kenarlar kameranın deseni ayırt etmesini engelleyebilir." }, { question: "QR kodun ortasına logo eklenebilir mi?", answer: "Hata düzeltme payı korunarak eklenebilir; yine de farklı cihazlarla baskı testi yapılmalıdır." }],
    relatedPaths: [{ label: "QR kod oluşturucu", path: "/qr-kod-olusturucu" }, { label: "Toplu QR kod oluşturma", path: "/toplu-qr-kod-olusturma" }],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(post: BlogPost, limit = 3) {
  return blogPosts.filter((candidate) => candidate.slug !== post.slug).sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category)).slice(0, limit);
}

export const blogEnhancements: Record<string, { checklist: string[]; sources: Array<{ label: string; url: string }> }> = {
  "qr-kod-rehberi": { checklist: ["Amaç ve hedef sayfa tanımlandı", "Statik veya dinamik yapı bilinçli seçildi", "Gerçek boyutta baskı testi yapıldı", "Yayın sonrası bağlantı kontrolü planlandı"], sources: [{ label: "DENSO WAVE: QR Code özellikleri", url: "https://www.qrcode.com/en/about/" }, { label: "Google Analytics: UTM ile kampanya ölçümü", url: "https://support.google.com/analytics/answer/10917952?hl=en" }] },
  "qr-kod-nedir-nasil-calisir": { checklist: ["Kodlanan bilgi güncel", "Kontrast ve sessiz alan yeterli", "Hedef sayfa mobil uyumlu", "Farklı cihazlarla tarama yapıldı"], sources: [{ label: "DENSO WAVE: QR Code nedir?", url: "https://www.qrcode.com/en/about/" }, { label: "DENSO WAVE: QR Code standartları", url: "https://www.qrcode.com/en/about/standards.html" }] },
  "dinamik-qr-kod-nedir": { checklist: ["Hedef güncelleme ihtiyacı belirlendi", "Yönlendirme alan adı doğrulandı", "Raporlama kapsamı kontrol edildi", "Hizmet sürekliliği planlandı"], sources: [{ label: "DENSO WAVE: QR Code türleri", url: "https://www.qrcode.com/en/codes/" }] },
  "restoran-qr-menu-hazirlama-rehberi": { checklist: ["Kategori ve fiyatlar güncel", "Menü telefonda rahat okunuyor", "Masa kartı gerçek ışıkta test edildi", "Tükenen ürün süreci belirlendi"], sources: [{ label: "Google: Mobil uyumlu içerik yaklaşımı", url: "https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing" }] },
  "qr-kod-takip-ve-analiz": { checklist: ["Kampanya hedefi ölçülebilir", "UTM adlandırması tutarlı", "Dağıtım noktaları ayrı izleniyor", "Tarama ve dönüşüm birlikte yorumlanıyor"], sources: [{ label: "Google Analytics: Özel kampanya URL'leri", url: "https://support.google.com/analytics/answer/10917952?hl=en" }] },
  "vcard-qr-kod-dijital-kartvizit": { checklist: ["İletişim bilgileri güncel", "Telefon ülke koduyla yazıldı", "Gereksiz kişisel veri çıkarıldı", "iOS ve Android cihazlarda denendi"], sources: [{ label: "DENSO WAVE: QR Code bilgi kapasitesi", url: "https://www.qrcode.com/en/about/version.html/index.html" }] },
  "qr-kod-baski-boyutu-ve-kalite": { checklist: ["Nihai baskı ölçüsü test edildi", "Yeterli kontrast bırakıldı", "Sessiz alan korunuyor", "Gerçek malzeme ve ışıkta tarandı"], sources: [{ label: "DENSO WAVE: QR Code özellikleri", url: "https://www.qrcode.com/en/about/" }] },
};

export function getBlogEnhancement(slug: string) {
  return blogEnhancements[slug];
}
