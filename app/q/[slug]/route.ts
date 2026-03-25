import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase yapılandırması sunucuda eksik." }, { status: 500 });
  }

  // Kayıt işlemi için tam yetkili (Service Role) Supabase istemcisi oluşturulur
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { email, password, full_name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre zorunludur." }, { status: 400 });
    }

    // 1. E-postanın kullanımda olup olmadığını kontrol et
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const userExists = listData.users.find((u) => u.email === email);
    if (userExists) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kullanımda." }, { status: 400 });
    }

    // 2. Kullanıcıyı oluştur (email_confirm = true vererek e-posta onayını direkt geçeriz)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, 
      user_metadata: {
        name: full_name || "",
        role: "user" // Varsayılan rol ataması
      }
    });

    if (error) throw error;
    return NextResponse.json({ success: true, user: data.user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Kayıt işlemi sırasında bir hata oluştu." }, { status: 500 });
  }
}