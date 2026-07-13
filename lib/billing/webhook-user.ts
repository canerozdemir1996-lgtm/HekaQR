export function normalizeBillingEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

export function selectWebhookUserId(input: {
  customUserId?: string | null;
  existingUserId?: string | null;
  emailUserId?: string | null;
}) {
  return input.customUserId?.trim()
    || input.existingUserId?.trim()
    || input.emailUserId?.trim()
    || null;
}
