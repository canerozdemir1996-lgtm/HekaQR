import { NextRequest, NextResponse } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { deleteUserAccount } from "@/lib/account/deleteAccount";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/v1/account — KVKK/GDPR "hesabımı sil" isteği.
 * Başarılı yanıt: { deleted: true, deleted_at: string }
 * Engellenme yanıtı (409): kullanıcı başka aktif üyesi bulunan bir
 * organizasyona sahipse { error: string, organizations: {id,name}[] } döner —
 * önce sahipliği devretmesi veya organizasyonu silmesi gerekir.
 */
export async function DELETE(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const result = await deleteUserAccount(sbAdmin(), auth.userId);

  if (!result.ok) {
    if (result.reason === "owns_shared_organization") {
      return NextResponse.json(
        {
          error: "Başka aktif üyesi bulunan organizasyon(lar)ınız var. Hesabınızı silmeden önce sahipliği devredin veya organizasyonu silin.",
          organizations: result.organizations,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Hesap silinemedi. Lütfen daha sonra tekrar deneyin." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, deleted_at: new Date().toISOString() });
}
