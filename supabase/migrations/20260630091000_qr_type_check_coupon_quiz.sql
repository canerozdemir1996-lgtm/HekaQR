alter table public.qr_codes drop constraint if exists qr_codes_qr_type_check;

alter table public.qr_codes
  add constraint qr_codes_qr_type_check check (qr_type in (
    'url','product','vcard','multi','wifi','email','sms','phone','whatsapp','text',
    'menu','feedback','booking','doc','appstore','quiz','event','location',
    'coupon','gs1','audio'
  ));
