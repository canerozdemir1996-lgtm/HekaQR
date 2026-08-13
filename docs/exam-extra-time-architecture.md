# Sınav ek süre mimarisi

## Ürün kararı

Ek süre bir sınav tanımı özelliği değil, başlatılmış katılımcı denemesine ait denetlenebilir bir override'dır. Yalnız QR/sınav sahibi devam eden denemeye 0–240 dakika arasında ek süre atayabilir. `0` değeri mevcut ek süreyi geri alır.

## Veri modeli ve migration kararı

Yeni tablo veya kolon gerekmiyor. Her değişiklik mevcut `exam_answers` tablosunda `question_id = __system_extra_time__` olan salt-eklemeli bir sistem olayıdır. `answer` JSON alanı `minutes`, `previousMinutes`, `reason`, `actorId` ve `grantedAt` taşır. En yeni olay geçerli değerdir; önceki satırlar audit geçmişidir.

Bu kayıtlar puanlama, soru analizi ve katılımcı cevaplarından filtrelenir. Mevcut `exam_answers_submission_idx` sorguyu kapsadığı için bu sürümde migration yoktur.

## Yetki ve API sözleşmesi

- Sahip yönetimi: `PATCH /api/v1/exams/submissions/:id` gövdesinde `extraTimeMinutes` ve `extraTimeReason`.
- Yetki: oturum zorunlu; submission'ın bağlı olduğu `qr_codes.user_id` oturum kullanıcısıyla aynı olmalı.
- Durum: yalnız `in_progress` denemeler değiştirilebilir.
- Validasyon: tam sayı, 0–240 dakika; değişiklik nedeni zorunlu.
- Katılımcı senkronu: `GET /api/v1/exams/submissions/:id?slug=...` aynı IP + user-agent fingerprint'i için `attempt` deadline bilgisini döndürür.

## Deadline kuralı

`deadline = exam_submissions.started_at + timeLimitMinutes + latestExtraTimeMinutes`

Başlangıç zamanı istemci gövdesinden değil, mevcut attempt satırından okunur. Submit API deadline'ı sunucu saatine göre ve yalnız ağ gecikmesi için 15 saniye toleransla uygular. Sınırsız (`timeLimitMinutes=0`) sınavlarda deadline yoktur ve ek süre sonucu değiştirmez.

## Yenileme ve çoklu cihaz

Attempt kimliği ve başlangıç zamanı localStorage'da korunur. Sayfa yenilendiğinde ve sınav açıkken istemci periyodik olarak deadline endpoint'inden sunucu zamanını alır. Fingerprint eşleşmeyen cihaz aynı attempt bilgisini göremez. IP lock ve single-attempt kuralları mevcut davranışını korur.

## Geri dönüş

UI ve API desteği geri alınabilir; sistem olayları puanlamadan filtrelendiği için eski sürümler açısından etkisiz, sıfır puanlı cevap satırları olarak kalır. Veri silme veya migration rollback gerektirmez.
