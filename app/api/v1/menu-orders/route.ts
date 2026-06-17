import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import type { MenuData, MenuOrder, MenuOrderItem } from "@/lib/menu";

export const dynamic = "force-dynamic";

type QrMenuRow = {
  id: string;
  user_id: string;
  title: string;
  short_slug: string;
  is_active: boolean;
  dynamic_content: MenuData | null;
};

function priceNumber(price?: string) {
  if (!price) return 0;
  const normalized = String(price).replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function cleanOrders(menu: MenuData): MenuOrder[] {
  return Array.isArray(menu.orders) ? menu.orders.slice(0, 500) : [];
}

function publicOrder(row: QrMenuRow, order: MenuOrder) {
  return {
    ...order,
    qrId: row.id,
    qrSlug: row.short_slug,
    restaurantName: row.dynamic_content?.restaurantName || row.title,
  };
}

export async function GET(req: NextRequest) {
  const publicSlug = String(req.nextUrl.searchParams.get("slug") || "").trim();
  const orderIds = String(req.nextUrl.searchParams.get("orderIds") || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (publicSlug && orderIds.length > 0) {
    const sb = sbAdmin();
    const { data, error } = await sb
      .from("qr_codes")
      .select("id,user_id,title,short_slug,is_active,dynamic_content")
      .eq("short_slug", publicSlug)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const row = data as QrMenuRow | null;
    if (!row?.dynamic_content || row.dynamic_content.kind !== "menu") {
      return NextResponse.json({ orders: [] });
    }

    const idSet = new Set(orderIds);
    const orders = cleanOrders(row.dynamic_content)
      .filter(order => idSet.has(order.id))
      .map(order => publicOrder(row, order));
    return NextResponse.json({ orders });
  }

  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = sbAdmin();
  let query = sb
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,dynamic_content")
    .not("dynamic_content", "is", null);
  if (auth.role !== "admin" && auth.role !== "owner") {
    query = query.eq("user_id", auth.userId);
  }
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = ((data ?? []) as QrMenuRow[])
    .filter(row => row.dynamic_content?.kind === "menu")
    .flatMap(row => cleanOrders(row.dynamic_content!).map(order => publicOrder(row, order)))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = String(body?.slug || "").trim();
  const tableNo = Number(body?.tableNo || 0);
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const note = String(body?.note || "").trim().slice(0, 500);

  if (!slug) return NextResponse.json({ error: "Menü bulunamadı." }, { status: 400 });
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > 999) {
    return NextResponse.json({ error: "Geçerli masa numarası seçin." }, { status: 400 });
  }
  if (rawItems.length === 0) return NextResponse.json({ error: "Sepet boş." }, { status: 400 });

  const sb = sbAdmin();
  const { data, error } = await sb
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,dynamic_content")
    .eq("short_slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = data as QrMenuRow | null;
  const menu = row?.dynamic_content;
  if (!row || !row.is_active || menu?.kind !== "menu") {
    return NextResponse.json({ error: "Menü aktif değil." }, { status: 404 });
  }
  if (menu.ordersEnabled === false) {
    return NextResponse.json({ error: "Bu menüde sipariş alma kapalı." }, { status: 400 });
  }
  const tableCount = Math.max(1, Math.min(999, Number(menu.tableCount || 10)));
  if (tableNo > tableCount) {
    return NextResponse.json({ error: `Bu menüde masa aralığı 1-${tableCount}.` }, { status: 400 });
  }

  const items: MenuOrderItem[] = [];
  for (const raw of rawItems.slice(0, 50)) {
    const itemId = String(raw?.itemId || "");
    const category = menu.categories.find(cat => cat.items.some(item => item.id === itemId));
    const item = category?.items.find(entry => entry.id === itemId);
    const qty = Math.max(1, Math.min(99, Number(raw?.qty || 1)));
    if (!category || !item || !item.name?.trim()) continue;
    const price = priceNumber(item.price);
    items.push({
      id: item.id,
      categoryId: category.id,
      name: item.name,
      qty,
      price: item.price,
      lineTotal: Math.round(price * qty * 100) / 100,
    });
  }

  if (items.length === 0) return NextResponse.json({ error: "Geçerli ürün bulunamadı." }, { status: 400 });

  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const createdAt = new Date().toISOString();
  const order: MenuOrder = {
    id: randomUUID(),
    tableNo,
    items,
    note,
    subtotal,
    currency: menu.currency || "TL",
    status: "new",
    createdAt,
    updatedAt: createdAt,
  };

  const nextMenu: MenuData = {
    ...menu,
    orders: [order, ...cleanOrders(menu)].slice(0, 500),
  };

  const { error: updateError } = await sb
    .from("qr_codes")
    .update({ dynamic_content: nextMenu, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ order: publicOrder(row, order) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = String(body?.orderId || "");
  const status = String(body?.status || "");
  if (!orderId || !["new", "preparing", "done", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz sipariş durumu." }, { status: 400 });
  }

  const sb = sbAdmin();
  let query = sb
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,dynamic_content")
    .not("dynamic_content", "is", null);
  if (auth.role !== "admin" && auth.role !== "owner") {
    query = query.eq("user_id", auth.userId);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = ((data ?? []) as QrMenuRow[]).find(qr => qr.dynamic_content?.orders?.some(order => order.id === orderId));
  if (!row?.dynamic_content) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });

  const updatedAt = new Date().toISOString();
  const nextMenu: MenuData = {
    ...row.dynamic_content,
    orders: cleanOrders(row.dynamic_content).map(order =>
      order.id === orderId ? { ...order, status: status as MenuOrder["status"], updatedAt } : order
    ),
  };

  const { error: updateError } = await sb
    .from("qr_codes")
    .update({ dynamic_content: nextMenu, updated_at: updatedAt })
    .eq("id", row.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, updatedAt });
}
