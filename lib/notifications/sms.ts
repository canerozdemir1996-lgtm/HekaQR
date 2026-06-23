const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim();
const netgsmUser = process.env.NETGSM_USERCODE?.trim();
const netgsmPass = process.env.NETGSM_PASSWORD?.trim();
const netgsmHeader = process.env.NETGSM_HEADER?.trim();

export function isSmsConfigured() {
  const hasTwilio = Boolean(twilioSid && twilioToken && twilioFrom);
  const hasNetgsm = Boolean(netgsmUser && netgsmPass && netgsmHeader);
  return hasTwilio || hasNetgsm;
}

export async function sendSms(input: { to: string; message: string }) {
  if (!isSmsConfigured()) {
    return { delivered: false, provider: "disabled" as const };
  }

  if (twilioSid && twilioToken && twilioFrom) {
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
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

    return { delivered: true, provider: "twilio" as const };
  }

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

    const response = await fetch("https://api.netgsm.com.tr/sms/send/xml", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "SMS gonderilemedi.");
    }

    return { delivered: true, provider: "netgsm" as const };
  }

  return { delivered: false, provider: "disabled" as const };
}
