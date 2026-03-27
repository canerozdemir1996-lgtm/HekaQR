import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Sadece Owner ve Admin erişebilir
    if (!session?.user || (session.user.role !== "owner" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase ortam değişkenleri (Service Role Key) eksik");
    }

    // Admin yetkileriyle Supabase Client oluşturuluyor
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Gerçek Auth kullanıcılarını getir
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    // 2. Tüm QR istatistiklerini getir
    const { data: qrData, error: qrError } = await supabaseAdmin.from("qr_codes").select("user_id, scan_count");
    if (qrError) throw qrError;

    // 3. Kullanıcı ve QR verilerini birleştir
    const usersList = usersData.users.map((u) => {
      const userQrs = qrData.filter((q) => q.user_id === u.id);
      const totalScans = userQrs.reduce((acc, curr) => acc + (curr.scan_count || 0), 0);
      return {
        id: u.id,
        email: u.email,
        role: u.user_metadata?.role || "user",
        status: "Active",
        qrs: userQrs.length,
        scans: totalScans,
        last_sign_in: u.last_sign_in_at
      };
    }).sort((a, b) => new Date(b.last_sign_in || 0).getTime() - new Date(a.last_sign_in || 0).getTime());

    return NextResponse.json({ usersList, metrics: { users: usersList.length, qrs: qrData.length, scans: qrData.reduce((acc, curr) => acc + (curr.scan_count || 0), 0) } });
  } catch (error: any) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}