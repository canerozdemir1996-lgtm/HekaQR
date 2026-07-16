# “Kendi Sınavlarım” ürün kararı

## Karar: GO, kayıtlı kullanıcı geçmişi olarak korunacak

Sayfa sınav oluşturan kişiye ait rapor ekranının alternatifi değildir. Katılımcının farklı QR sınavlarında verdiği ve kendi doğrulanmış hesap e-postasıyla eşleşen sonuçları tek yerde bulmasını sağlar. Menüde oturum gerektiren kişisel geçmiş yüzeyi olarak kalır.

## Erişim matrisi

| Persona | Liste/geçmiş | Tek sonuç | Cevap anahtarı | E-posta gönderimi |
| --- | --- | --- | --- | --- |
| Kayıtlı katılımcı | Yalnız auth e-postası ile `participant.email` eşleşen kayıtlar | Panelden | Yalnız sınav `showQuestionSummary` izni veriyorsa ve değerlendirme bittiyse | Yalnız auth e-postasına |
| Misafir katılımcı | Yok | Submission kimliği + aynı cihaz fingerprint'i ile sonuç linki | Public submit sözleşmesi kadar; doğru cevap anahtarı gönderilmez | Yok |
| Sınav sahibi | Yalnız kendi QR kodlarının raporu | Sahip panelinden | Değerlendirme amacıyla tam erişim | Katılımcı adına gönderemez |
| Başka hesap/cihaz | Yok | Fingerprint veya sahiplik eşleşmezse 404/401 | Yok | Yok |

## Neden ayrı sayfa var

- Tek sonuç linki cihaz/fingerprint kaybında sürdürülebilir bir geçmiş değildir.
- Hesap e-postası eşleşmesi, yeni token tablosu veya magic-link altyapısı gerektirmeden kayıtlı kullanıcıya kalıcı değer verir.
- Misafirler için global e-posta araması açılmaz; böylece tahmin edilebilir e-posta üzerinden listeleme riski oluşmaz.

## Privacy ve kötüye kullanım kontrolleri

- API auth olmadan liste ve e-posta işlemi yapmaz.
- İstemciden e-posta parametresi kabul edilmez; Supabase Auth kullanıcısının e-postası sunucuda okunur.
- Sonuç e-postası yalnız aynı auth e-postasına gönderilir.
- Ek süre audit satırları ve diğer sistem cevapları katılımcı çıktısından filtrelenir.
- `showQuestionSummary=false`, `needs_review` veya `in_progress` durumunda doğru cevap ve doğruluk sonucu gizlenir.
- Owner raporu, hesap geçmişi ve misafir sonuç linki `Cache-Control: no-store` kullanır.

## Veri saklama ve sonraki adım

Kayıtlar `exam_submissions` yaşam döngüsünü izler; ayrı kopya tutulmaz. Hesap dışa aktarma/silme politikaları bu veriyi kapsamalıdır. İleride misafir geçmişi istenirse e-posta parametreli arama yerine kısa ömürlü, tek kullanımlık magic-link token modeli tasarlanmalıdır; bu sürümde gerekli değildir.
