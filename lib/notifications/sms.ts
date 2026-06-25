type FetchFn = typeof fetch;

export type SendSmsResult = { delivered: boolean; provider: "twilio" | "netgsm" | "iletimerkezi" | "infobip" | "disabled" };

function normalizeTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return `90${digits}`;
}

export function isSmsConfigured(): boolean {
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim() && process.env.TWILIO_FROM_NUMBER?.trim(),
  );
  const hasNetgsm = Boolean(
    process.env.NETGSM_USERCODE?.trim() && process.env.NETGSM_PASSWORD?.trim() && process.env.NETGSM_HEADER?.trim(),
  );
  const hasIletimerkezi = Boolean(
    process.env.ILETIMERKEZI_KEY?.trim() && process.env.ILETIMERKEZI_HASH?.trim() && process.env.ILETIMERKEZI_SENDER?.trim(),
  );
  const hasInfobip = Boolean(
    process.env.INFOBIP_API_KEY?.trim() && process.env.INFOBIP_BASE_URL?.trim() && process.env.INFOBIP_SENDER?.trim(),
  );
  return hasTwilio || hasNetgsm || hasIletimerkezi || hasInfobip;
}

export async function sendSms(input: { to: string; message: string }, fetchFn: FetchFn = fetch): Promise<SendSmsResult> {
  if (!isSmsConfigured()) {
    return { delivered: false, provider: "disabled" };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim();
  if (twilioSid && twilioToken && twilioFrom) {
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const response = await fetchFn(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: input.to,
        From: twilioFrom,
        Body: input.message,
      }).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "SMS gönderilemedi.");
    }

    return { delivered: true, provider: "twilio" };
  }

  const netgsmUser = process.env.NETGSM_USERCODE?.trim();
  const netgsmPass = process.env.NETGSM_PASSWORD?.trim();
  const netgsmHeader = process.env.NETGSM_HEADER?.trim();
  if (netgsmUser && netgsmPass && netgsmHeader) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <usercode>${netgsmUser}</usercode>
    <password>${netgsmPass}</password>
    <msgheader>${netgsmHeader}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${input.message}]]></msg>
    <no>${input.to}</no>
  </body>
</mainbody>`;

    const response = await fetchFn("https://api.netgsm.com.tr/sms/send/xml", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "SMS gönderilemedi.");
    }

    return { delivered: true, provider: "netgsm" };
  }

  const iletimerkeziKey = process.env.ILETIMERKEZI_KEY?.trim();
  const iletimerkeziHash = process.env.ILETIMERKEZI_HASH?.trim();
  const iletimerkeziSender = process.env.ILETIMERKEZI_SENDER?.trim();
  if (iletimerkeziKey && iletimerkeziHash && iletimerkeziSender) {
    const response = await fetchFn("https://api.iletimerkezi.com/v1/send-sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        request: {
          authentication: { key: iletimerkeziKey, hash: iletimerkeziHash },
          order: {
            sender: iletimerkeziSender,
            sendDateTime: "",
            message: {
              text: input.message,
              receiverList: { number: [normalizeTrPhone(input.to)] },
            },
          },
        },
      }),
    });

    const body: { response?: { status?: { code?: string; message?: string } } } | null = await response
      .json()
      .catch(() => null);
    const statusCode = body?.response?.status?.code;
    if (!response.ok || statusCode !== "200") {
      throw new Error(body?.response?.status?.message || "SMS gönderilemedi.");
    }

    return { delivered: true, provider: "iletimerkezi" };
  }

  const infobipApiKey = process.env.INFOBIP_API_KEY?.trim();
  const infobipBaseUrl = process.env.INFOBIP_BASE_URL?.trim();
  const infobipSender = process.env.INFOBIP_SENDER?.trim();
  if (infobipApiKey && infobipBaseUrl && infobipSender) {
    const response = await fetchFn(`https://${infobipBaseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${infobipApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to: input.to }],
            from: infobipSender,
            text: input.message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "SMS gönderilemedi.");
    }

    return { delivered: true, provider: "infobip" };
  }

  return { delivered: false, provider: "disabled" };
}
