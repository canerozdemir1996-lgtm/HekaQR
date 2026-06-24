type FetchFn = typeof fetch;

export type SendSmsResult = { delivered: boolean; provider: "twilio" | "netgsm" | "infobip" | "disabled" };

export function isSmsConfigured(): boolean {
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim() && process.env.TWILIO_FROM_NUMBER?.trim(),
  );
  const hasNetgsm = Boolean(
    process.env.NETGSM_USERCODE?.trim() && process.env.NETGSM_PASSWORD?.trim() && process.env.NETGSM_HEADER?.trim(),
  );
  const hasInfobip = Boolean(
    process.env.INFOBIP_API_KEY?.trim() && process.env.INFOBIP_BASE_URL?.trim() && process.env.INFOBIP_SENDER?.trim(),
  );
  return hasTwilio || hasNetgsm || hasInfobip;
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
      throw new Error(text || "SMS gonderilemedi.");
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
      throw new Error(text || "SMS gonderilemedi.");
    }

    return { delivered: true, provider: "netgsm" };
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
      throw new Error(text || "SMS gonderilemedi.");
    }

    return { delivered: true, provider: "infobip" };
  }

  return { delivered: false, provider: "disabled" };
}
