const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "fisedo.com",
  "1secmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
]);

export function isDisposableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").pop();
  return Boolean(domain && DISPOSABLE_EMAIL_DOMAINS.has(domain));
}
