import type { Metadata } from "next";
import InviteAcceptanceClient from "./InviteAcceptanceClient";

export const metadata: Metadata = {
  title: "Organizasyon Daveti | QR Publish",
  description: "QR Publish organizasyon davetinizi görüntüleyin ve kabul edin.",
  robots: { index: false, follow: false },
};

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return <InviteAcceptanceClient token={params.token} />;
}
