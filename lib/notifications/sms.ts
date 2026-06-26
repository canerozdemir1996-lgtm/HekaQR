type FetchFn = typeof fetch;

export type SmsProvider = "twilio" | "netgsm" | "iletimerkezi" | "infobip" | "disabled";
export type SendSmsResult = { delivered: boolean; provider: SmsProvider };

function normalizeTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return `90${digits}`;
}

/** SMS_TEST_MODE=true → gerçek istek atılmaz, başarılı gibi döner (development) */
function isTestMode(): boolean {
  return process.env.SMS_TEST_MODE === "true";
}

export type SmsProviderStatus = {
  provider: SmsProvider;
  configured: boolean;
  label: string;
};

export function getSmsProviderStatuses(): SmsProviderStatus[] {
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_FROM_NUMBER?.trim(),
  );
  const hasNetgsm = Boolean(
    process.env.NETGSM_USERCODE?.trim() &&
    process.env.NETGSM_PASSWORD?.trim() &&
    process.env.NETGSM_HEADER?.trim(),
  );
  const hasIletiMerkeziUserPass = Boolean(
    process.env.ILETI_MERKEZI_USERNAME?.trim() &&
    process.env.ILETI_MERKEZI_PASSWORD?.trim() &&
    process.env.ILETI_MERKEZI_SENDER?.trim(),
  );
  const hasIletiMerkeziKeyHash = Boolean(
    process.env.ILETIMERKEZI_KEY?.trim() &&
    process.env.ILETIMERKEZI_HASH?.trim() &&
    process.env.ILETIMERKEZI_SENDER?.trim(),
  );
  const hasInfobip = Boolean(
    process.env.INFOBIP_API_KEY?.trim() &&
    process.env.INFOBIP_BASE_URL?.trim() &&
    process.env.INFOBIP_SENDER?.trim(),
  );
  return [
    { provider: "twilio", configured: hasTwilio, label: "Twilio" },
    { provider: "netgsm", configured: hasNetgsm, label: "Netgsm" },
    { provider: "iletimerkezi", configured: hasIletiMerkeziUserPass || hasIletiMerkeziKeyHash, label: "İleti Merkezi" },
    { provider: "infobip", configured: hasInfobip, label: "Infobip" },
  ];
}

export function getActiveProvider(): SmsProvider {
  if (isTestMode()) return "disabled";
  const statuses = getSmsProviderStatuses();
  return statuses.find(s => s.configured)?.provider ?? "disabled";
}

export function isSmsConfigured(): boolean {
  if (isTestMode()) return true;
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_FROM_NUMBER?.trim(),
  );
  const hasNetgsm = Boolean(
    process.env.NETGSM_USERCODE?.trim() &&
    process.env.NETGSM_PASSWORD?.trim() &&
    process.env.NETGSM_HEADER?.trim(),
  );
  // İleti Merkezi — username/password (yeni, resmi format)
  const hasIletiMerkeziUserPass = Boolean(
    process.env.ILETI_MERKEZI_USERNAME?.trim() &&
    process.env.ILETI_MERKEZI_PASSWORD?.trim() &&
    process.env.ILETI_MERKEZI_SENDER?.trim(),
  );
  // İleti Merkezi — key/hash (eski format, geriye dönük uyumluluk)
  const hasIletiMerkeziKeyHash = Boolean(
    process.env.ILETIMERKEZI_KEY?.trim() &&
    process.env.ILETIMERKEZI_HASH?.trim() &&
    process.env.ILETIMERKEZI_SENDER?.trim(),
  );
  const hasInfobip = Boolean(
    process.env.INFOBIP_API_KEY?.trim() &&
    process.env.INFOBIP_BASE_URL?.trim() &&
    process.env.INFOBIP_SENDER?.trim(),
  );
  return hasTwilio || hasNetgsm || hasIletiMerkeziUserPass || hasIletiMerkeziKeyHash || hasInfobip;
}

function logSms(provider: SmsProvider, to: string, success: boolean, detail?: string) {
  const tag = success ? "[SMS ok]" : "[SMS fail]";
  const safe = to.slice(0, 4) + "****" + to.slice(-2);
  console.log(`${tag} provider=${provider} to=${safe}${detail ? ` detail=${detail}` : ""}`);
}

async function sendViaTwilio(to: string, message: string, fetchFn: FetchFn): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_FROM_NUMBER!.trim();
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const response = await fetchFn(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logSms("twilio", to, false, text.slice(0, 120));
    throw new Error(text || "Twilio SMS gönderilemedi.");
  }
  logSms("twilio", to, true);
  return { delivered: true, provider: "twilio" };
}

async function sendViaNetgsm(to: string, message: string, fetchFn: FetchFn): Promise<SendSmsResult> {
  const user = process.env.NETGSM_USERCODE!.trim();
  const pass = process.env.NETGSM_PASSWORD!.trim();
  const header = process.env.NETGSM_HEADER!.trim();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <usercode>${user}</usercode>
    <password>${pass}</password>
    <msgheader>${header}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${message}]]></msg>
    <no>${normalizeTrPhone(to)}</no>
  </body>
</mainbody>`;

  const response = await fetchFn("https://api.netgsm.com.tr/sms/send/xml", {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logSms("netgsm", to, false, text.slice(0, 120));
    throw new Error(text || "Netgsm SMS gönderilemedi.");
  }
  logSms("netgsm", to, true);
  return { delivered: true, provider: "netgsm" };
}

/**
 * İleti Merkezi — username/password ile resmi API formatı.
 * Env: ILETI_MERKEZI_USERNAME, ILETI_MERKEZI_PASSWORD, ILETI_MERKEZI_SENDER,
 *      ILETI_MERKEZI_API_URL (opsiyonel, default: https://api.iletimerkezi.com/v1/send-sms/json)
 */
async function sendViaIletiMerkeziUserPass(to: string, message: string, fetchFn: FetchFn): Promise<SendSmsResult> {
  const username = process.env.ILETI_MERKEZI_USERNAME!.trim();
  const password = process.env.ILETI_MERKEZI_PASSWORD!.trim();
  const sender = process.env.ILETI_MERKEZI_SENDER!.trim();
  const apiUrl = (process.env.ILETI_MERKEZI_API_URL?.trim()) || "https://api.iletimerkezi.com/v1/send-sms/json";

  const payload = {
    request: {
      authentication: { username, password },
      order: {
        sender,
        sendDateTime: "",
        message: {
          text: message,
          receiverList: { number: [normalizeTrPhone(to)] },
        },
      },
    },
  };

  const response = await fetchFn(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const body: { response?: { status?: { code?: string; message?: string } } } | null =
    await response.json().catch(() => null);
  const statusCode = body?.response?.status?.code;
  const statusMsg = body?.response?.status?.message ?? "";

  if (!response.ok || statusCode !== "200") {
    logSms("iletimerkezi", to, false, `code=${statusCode} msg=${statusMsg.slice(0, 80)}`);
    throw new Error(statusMsg || "İleti Merkezi SMS gönderilemedi.");
  }
  logSms("iletimerkezi", to, true);
  return { delivered: true, provider: "iletimerkezi" };
}

/**
 * İleti Merkezi — eski key/hash formatı (geriye dönük uyumluluk).
 * Env: ILETIMERKEZI_KEY, ILETIMERKEZI_HASH, ILETIMERKEZI_SENDER
 */
async function sendViaIletiMerkeziKeyHash(to: string, message: string, fetchFn: FetchFn): Promise<SendSmsResult> {
  const key = process.env.ILETIMERKEZI_KEY!.trim();
  const hash = process.env.ILETIMERKEZI_HASH!.trim();
  const sender = process.env.ILETIMERKEZI_SENDER!.trim();

  const payload = {
    request: {
      authentication: { key, hash },
      order: {
        sender,
        sendDateTime: "",
        message: {
          text: message,
          receiverList: { number: [normalizeTrPhone(to)] },
        },
      },
    },
  };

  const response = await fetchFn("https://api.iletimerkezi.com/v1/send-sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const body: { response?: { status?: { code?: string; message?: string } } } | null =
    await response.json().catch(() => null);
  const statusCode = body?.response?.status?.code;
  const statusMsg = body?.response?.status?.message ?? "";

  if (!response.ok || statusCode !== "200") {
    logSms("iletimerkezi", to, false, `code=${statusCode} msg=${statusMsg.slice(0, 80)}`);
    throw new Error(statusMsg || "İleti Merkezi SMS gönderilemedi.");
  }
  logSms("iletimerkezi", to, true);
  return { delivered: true, provider: "iletimerkezi" };
}

async function sendViaInfobip(to: string, message: string, fetchFn: FetchFn): Promise<SendSmsResult> {
  const apiKey = process.env.INFOBIP_API_KEY!.trim();
  const baseUrl = process.env.INFOBIP_BASE_URL!.trim();
  const sender = process.env.INFOBIP_SENDER!.trim();

  const response = await fetchFn(`https://${baseUrl}/sms/2/text/advanced`, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [{ destinations: [{ to }], from: sender, text: message }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logSms("infobip", to, false, text.slice(0, 120));
    throw new Error(text || "Infobip SMS gönderilemedi.");
  }
  logSms("infobip", to, true);
  return { delivered: true, provider: "infobip" };
}

/**
 * SMS gönderir. Sağlayıcılar öncelik sırasıyla denenir.
 * Öncelik: Twilio → Netgsm → İleti Merkezi (username/password) → İleti Merkezi (key/hash) → Infobip
 * SMS_TEST_MODE=true ise gerçek istek atılmaz.
 */
export async function sendSms(
  input: { to: string; message: string },
  fetchFn: FetchFn = fetch,
): Promise<SendSmsResult> {
  if (isTestMode()) {
    console.log(`[SMS test-mode] to=${input.to} message="${input.message.slice(0, 40)}..."`);
    return { delivered: true, provider: "disabled" };
  }

  if (!isSmsConfigured()) {
    return { delivered: false, provider: "disabled" };
  }

  if (
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_FROM_NUMBER?.trim()
  ) {
    return sendViaTwilio(input.to, input.message, fetchFn);
  }

  if (
    process.env.NETGSM_USERCODE?.trim() &&
    process.env.NETGSM_PASSWORD?.trim() &&
    process.env.NETGSM_HEADER?.trim()
  ) {
    return sendViaNetgsm(input.to, input.message, fetchFn);
  }

  if (
    process.env.ILETI_MERKEZI_USERNAME?.trim() &&
    process.env.ILETI_MERKEZI_PASSWORD?.trim() &&
    process.env.ILETI_MERKEZI_SENDER?.trim()
  ) {
    return sendViaIletiMerkeziUserPass(input.to, input.message, fetchFn);
  }

  if (
    process.env.ILETIMERKEZI_KEY?.trim() &&
    process.env.ILETIMERKEZI_HASH?.trim() &&
    process.env.ILETIMERKEZI_SENDER?.trim()
  ) {
    return sendViaIletiMerkeziKeyHash(input.to, input.message, fetchFn);
  }

  if (
    process.env.INFOBIP_API_KEY?.trim() &&
    process.env.INFOBIP_BASE_URL?.trim() &&
    process.env.INFOBIP_SENDER?.trim()
  ) {
    return sendViaInfobip(input.to, input.message, fetchFn);
  }

  return { delivered: false, provider: "disabled" };
}
