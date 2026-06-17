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
  return Array.isArray(menu.orders) ? menu.orders.slice(0, 1000) : [];
}

function publicOrder(row: QrMenuRow, order: MenuOrder) {
  return {
    ...order,
    qrId: row.id,
    qrSlug: row.short_slug,
    restaurantName: row.dynamic_content?.restaurantName || row.title,
  };
}

function parseDateRange(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "";
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  if (scope === "all") return { from: null as Date | null, to: null as Date | null };
  const today = new Date();
  const fallbackFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fallbackTo = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : fallbackFrom;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : fallbackTo;
  return {
    from: Number.isNaN(+from) ? fallbackFrom : from,
    to: Number.isNaN(+to) ? fallbackTo : to,
  };
}

function inRange(order: MenuOrder, from: Date | null, to: Date | null) {
  const time = +new Date(order.createdAt);
  if (!Number.isFinite(time)) return false;
  if (from && time < +from) return false;
  if (to && time > +to) return false;
  return true;
}

function summarizeOrders(orders: ReturnType<typeof publicOrder>[]) {
  const paidOrders = orders.filter(order => order.status !== "cancelled");
  const revenue = paidOrders.reduce((sum, order) => sum + order.subtotal, 0);
  const productMap = new Map<string, { name: string; qty: number; total: number }>();
  paidOrders.forEach(order => order.items.forEach(item => {
    const current = productMap.get(item.id) ?? { name: item.name, qty: 0, total: 0 };
    current.qty += item.qty;
    current.total += item.lineTotal;
    productMap.set(item.id, current);
  }));
  return {
    currency: orders[0]?.currency || "TL",
    revenue,
    totalOrders: orders.length,
    newOrders: orders.filter(order => order.status === "new").length,
    preparingOrders: orders.filter(order => order.status === "preparing").length,
    doneOrders: orders.filter(order => order.status === "done").length,
    cancelledOrders: orders.filter(order => order.status === "cancelled").length,
    avgBasket: paidOrders.length ? revenue / paidOrders.length : 0,
    topProducts: Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const publicSlug = String(req.nextUrl.searchParams.get("slug") || "").trim();
  const orderIds = String(req.nextUrl.searchParams.get("orderIds") || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean)
    .slice(0, 20);
  const tableNo = Number(req.nextUrl.searchParams.get("tableNo") || 0);

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
      .filter(order => !Number.isInteger(tableNo) || tableNo <= 0 || order.tableNo === tableNo)
      .map(order => publicOrder(row, order));
    return NextResponse.json({ orders });
  }

  const auth = await authRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const pageRaw = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = [20, 50, 100].includes(limitRaw) ? limitRaw : 20;
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const { from, to } = parseDateRange(req);

  const { data, error } = await sbAdmin()
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,dynamic_content")
    .eq("user_id", auth.userId)
    .not("dynamic_content", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allOrders = ((data ?? []) as QrMenuRow[])
    .filter(row => row.dynamic_content?.kind === "menu")
    .flatMap(row => cleanOrders(row.dynamic_content!).map(order => publicOrder(row, order)))
    .filter(order => inRange(order, from, to))
    .filter(order => status === "all" || order.status === status)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const total = allOrders.length;
  const orders = allOrders.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    orders,
    summary: summarizeOrders(allOrders),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      from: from?.toISOString().slice(0, 10) ?? null,
      to: to?.toISOString().slice(0, 10) ?? null,
      status,
    },
  });
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
    orders: [order, ...cleanOrders(menu)].slice(0, 1000),
  };

  const { error: updateError } = await sb
    .from("qr_codes")
    .update({ dynamic_content: nextMenu, updated_at: createdAt })
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

  const { data, error } = await sbAdmin()
    .from("qr_codes")
    .select("id,user_id,title,short_slug,is_active,dynamic_content")
    .eq("user_id", auth.userId)
    .not("dynamic_content", "is", null);
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

  const { error: updateError } = await sbAdmin()
    .from("qr_codes")
    .update({ dynamic_content: nextMenu, updated_at: updatedAt })
    .eq("id", row.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, updatedAt });
}
