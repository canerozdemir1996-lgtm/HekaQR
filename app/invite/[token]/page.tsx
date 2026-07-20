import type { Metadata } from "next";
import InviteAcceptanceClient from "./InviteAcceptanceClient";

export const metadata: Metadata = {
  title: "Organizasyon Daveti | QR Publish",
  description: "QR Publish organizasyon davetinizi görüntüleyin ve kabul edin.",
  robots: { index: false, follow: false },
};

export default function InvitePage({ params }: { params: { token: string } }) {
  return <InviteAcceptanceClient token={params.token} />;
}
