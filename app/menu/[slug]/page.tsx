import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import type { MenuCategory, MenuData, MenuDiscount, MenuItem } from "@/lib/menu";
import { MenuOrderWidget } from "./MenuOrderWidget";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getMenu(slug: string) {
  const sb = getPublicClient();
  const { data } = await sb
    .from("qr_codes")
    .select("title,short_slug,is_active,qr_type,dynamic_content")
    .ilike("short_slug", slug)
    .maybeSingle();
  return data as { title: string; short_slug: string; is_active: boolean; qr_type: string; dynamic_content: MenuData | null } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const qr = await getMenu(slug);
  const menu = qr?.dynamic_content;
  return { title: menu?.restaurantName ? `${menu.restaurantName} Menü | QR Publish` : "Menü | QR Publish" };
}

function themeClasses(theme: MenuData["theme"], template: MenuData["template"]) {
  if (theme === "dark") {
    return {
      page: "bg-slate-950 text-slate-100",
      panel: "border-white/10 bg-white/[0.04]",
      softPanel: "border-white/10 bg-slate-900",
      muted: "text-slate-400",
      chip: "bg-white/10 text-slate-200",
      nav: "bg-slate-950/85 border-white/10",
      accent: template === "premium" ? "text-amber-300" : "text-teal-300",
    };
  }
  return {
    page: "bg-slate-50 text-slate-950",
    panel: "border-slate-200 bg-white",
    softPanel: "border-slate-200 bg-white",
    muted: "text-slate-500",
    chip: "bg-slate-100 text-slate-700",
    nav: "bg-slate-50/90 border-slate-200",
    accent: "text-teal-700",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "kategori";
}

function getLogoMode(menu: MenuData) {
  return menu.logoMode ?? "small-left";
}

function getCategoryNavStyle(menu: MenuData, template: MenuData["template"]) {
  return menu.categoryNavStyle ?? (template === "compact" ? "compact" : "chips");
}

function getCategoryShowcase(menu: MenuData, template: MenuData["template"]) {
  return menu.categoryShowcase ?? (template === "catalog" ? "both" : "hidden");
}

function getProductLayout(menu: MenuData, template: MenuData["template"]) {
  return menu.productLayout ?? (template === "premium" ? "image-top" : "image-left");
}

function isDiscountActive(discount: MenuDiscount, now: Date) {
  if (discount.active === false) return false;
  if (discount.startDate && now < new Date(`${discount.startDate}T00:00:00`)) return false;
  if (discount.endDate && now > new Date(`${discount.endDate}T23:59:59`)) return false;
  return Number(String(discount.value).replace(",", ".")) > 0;
}

function priceNumber(price?: string) {
  if (!price) return null;
  const normalized = price.replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function matchingDiscount(menu: MenuData, category: MenuCategory, item: MenuItem, now: Date) {
  const discounts = (menu.discounts ?? []).filter(discount => isDiscountActive(discount, now));
  const candidates = discounts.filter(discount => {
    if (discount.scope === "all") return true;
    if (discount.scope === "category") return (discount.targetIds ?? []).includes(category.id);
    return (discount.targetIds ?? []).includes(item.id);
  });
  return candidates[0] ?? null;
}

function discountedPrice(price: string | undefined, discount: MenuDiscount | null) {
  const base = priceNumber(price);
  if (base === null || !discount) return null;
  const value = Number(String(discount.value).replace(",", "."));
  const next = discount.type === "percent" ? base * (1 - value / 100) : base - value;
  return Math.max(0, Math.round(next * 100) / 100);
}

function discountLabel(discount: MenuDiscount) {
  return discount.type === "percent" ? `%${discount.value}` : `${discount.value} indirim`;
}

function ItemCard({
  category,
  item,
  menu,
  theme,
  compact,
  layout,
}: {
  category: MenuCategory;
  item: MenuItem;
  menu: MenuData;
  theme: ReturnType<typeof themeClasses>;
  compact?: boolean;
  layout: NonNullable<MenuData["productLayout"]>;
}) {
  const discount = matchingDiscount(menu, category, item, new Date());
  const nextPrice = discountedPrice(item.price, discount);
  const hasMedia = Boolean(item.image);

  const topImage = layout === "image-top";
  const rightImage = layout === "image-right";
  const roundImage = layout === "image-round";
  const sideImage = layout === "image-left" || layout === "image-right" || layout === "image-round";
  const media = hasMedia ? (
    <div className={`${topImage ? "aspect-[16/10] w-full" : "h-full min-h-28 w-28"} ${roundImage ? "p-3" : ""} bg-slate-200`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image} alt="" className={`h-full w-full object-cover ${roundImage ? "rounded-full" : ""}`} />
    </div>
  ) : null;

  return (
    <article className={`overflow-hidden rounded-2xl border shadow-sm ${theme.panel} ${sideImage && hasMedia ? `grid ${rightImage ? "grid-cols-[1fr_112px]" : "grid-cols-[112px_1fr]"}` : ""}`}>
      {hasMedia && !rightImage && media}
      <div className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className={`${compact ? "text-sm" : "text-base"} font-black`}>{item.name}</h3>
            {item.description && <p className={`mt-1 text-sm leading-relaxed ${theme.muted}`}>{item.description}</p>}
          </div>
          {item.price && (
            <div className="shrink-0 text-right">
              {nextPrice !== null && <p className="text-xs font-bold text-slate-400 line-through">{menu.currency}{item.price}</p>}
              <p className={`text-base font-black ${nextPrice !== null ? theme.accent : ""}`}>{menu.currency}{nextPrice ?? item.price}</p>
            </div>
          )}
        </div>
        {discount && (
          <span className="mt-3 inline-flex rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">
            {discount.name || "İndirim"} · {discountLabel(discount)}
          </span>
        )}
        <button
          type="button"
          data-menu-add={item.id}
          className="mt-3 inline-flex rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white shadow-sm"
        >
          Sepete Ekle
        </button>
        {(item.calories || item.protein || item.carbs || item.fat || item.allergens) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.calories && <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${theme.chip}`}>{item.calories} kcal</span>}
            {item.protein && <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${theme.chip}`}>Protein {item.protein}</span>}
            {item.carbs && <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${theme.chip}`}>Karbonhidrat {item.carbs}</span>}
            {item.fat && <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${theme.chip}`}>Yağ {item.fat}</span>}
            {item.allergens && <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Alerjen: {item.allergens}</span>}
          </div>
        )}
      </div>
      {hasMedia && rightImage && media}
    </article>
  );
}

export default async function MenuPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ table?: string }> }) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const qr = await getMenu(slug);
  if (!qr || !qr.is_active || !qr.dynamic_content?.kind || qr.dynamic_content.kind !== "menu") notFound();

  const menu = qr.dynamic_content;
  const template = menu.template ?? "hero";
  const logoMode = getLogoMode(menu);
  const navStyle = getCategoryNavStyle(menu, template);
  const showcase = getCategoryShowcase(menu, template);
  const productLayout = getProductLayout(menu, template);
  const theme = themeClasses(menu.theme || "classic", template);
  const categories = menu.categories.filter(category => category.name?.trim());
  const showLogo = Boolean(menu.logo && logoMode !== "hidden");
  const customBg = menu.theme !== "dark" && /^#([0-9a-f]{3}){1,2}$/i.test(menu.backgroundColor || "") ? menu.backgroundColor : undefined;
  const parsedTable = Number(query?.table || 0);
  const tableCount = Math.max(1, Math.min(999, Number(menu.tableCount || 10)));
  const tableParam = Number.isInteger(parsedTable) && parsedTable > 0
    ? (parsedTable <= tableCount ? parsedTable : 0)
    : 0;

  return (
    <main className={`min-h-screen ${theme.page}`} style={customBg ? { backgroundColor: customBg } : undefined}>
      <section className={`mx-auto min-h-screen w-full ${template === "premium" ? "max-w-5xl" : "max-w-3xl"}`}>
        <header className={`relative overflow-hidden ${template === "compact" ? "rounded-b-3xl" : ""}`}>
          <div className={`${template === "compact" ? "h-40" : logoMode === "center-large" ? "h-80" : "h-64"} bg-slate-900`}>
            {menu.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={menu.coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 via-slate-900 to-violet-900" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {showLogo && logoMode === "floating" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={menu.logo} alt="" className="absolute right-5 top-5 h-20 w-20 rounded-3xl border-[3px] border-white/70 bg-white object-cover shadow-2xl" />
          )}
          <div className={`absolute bottom-0 left-0 right-0 p-6 ${logoMode === "center-large" ? "text-center" : ""}`}>
            {showLogo && logoMode !== "floating" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={menu.logo}
                alt=""
                className={`${logoMode === "center-large" ? "mx-auto h-28 w-28 rounded-[2rem]" : "h-16 w-16 rounded-2xl"} mb-4 border border-white/40 bg-white object-cover shadow-xl`}
              />
            )}
            <h1 className="text-3xl font-black tracking-tight text-white">{menu.restaurantName}</h1>
            {menu.subtitle && <p className="mt-2 text-sm font-semibold text-white/75">{menu.subtitle}</p>}
          </div>
        </header>

        {categories.length > 1 && navStyle !== "hidden" && (
          <nav className={`sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-xl ${theme.nav}`}>
            <div className={`flex overflow-x-auto ${navStyle === "round" ? "gap-3" : "gap-2"}`} style={{ scrollbarWidth: "none" }}>
              {categories.map(category => (
                <a
                  key={category.id}
                  href={`#${slugify(category.id)}`}
                  className={`shrink-0 border border-current/10 font-black transition-colors hover:border-current/30 ${
                    navStyle === "round"
                      ? "flex w-[88px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px]"
                      : navStyle === "pills"
                        ? "rounded-full px-4 py-2 text-sm"
                        : navStyle === "compact"
                          ? "rounded-lg px-2.5 py-1 text-[11px]"
                          : "rounded-full px-3 py-1.5 text-xs"
                  }`}
                >
                  {navStyle === "round" && (
                    <span className="block h-12 w-12 overflow-hidden rounded-full bg-slate-200 ring-1 ring-current/10">
                      {category.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={category.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                  )}
                  <span className="max-w-full truncate">{category.name}</span>
                </a>
              ))}
            </div>
          </nav>
        )}

        {showcase !== "hidden" && categories.length > 0 && (
          <div className="flex gap-3 overflow-x-auto px-4 py-5" style={{ scrollbarWidth: "none" }}>
            {categories.map(category => (
              <a key={category.id} href={`#${slugify(category.id)}`} className={`w-40 shrink-0 overflow-hidden rounded-2xl border shadow-sm ${theme.softPanel}`}>
                {(showcase === "image" || showcase === "both") && (
                  <div className="aspect-square bg-slate-200">
                    {category.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={category.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-teal-500 to-slate-800" />
                    )}
                  </div>
                )}
                {(showcase === "text" || showcase === "both") && <p className={`${showcase === "text" ? "p-4 text-base" : "p-3 text-sm"} font-black`}>{category.name}</p>}
              </a>
            ))}
          </div>
        )}

        <div className={`space-y-8 px-4 py-6 sm:px-6 ${template === "premium" ? "lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0" : ""}`}>
          {categories.map((category) => (
            <section key={category.id} id={slugify(category.id)} className="scroll-mt-20 space-y-3">
              <div className={`flex items-center gap-3 ${template === "catalog" && category.image ? `rounded-2xl border p-3 ${theme.softPanel}` : ""}`}>
                {template !== "compact" && category.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={category.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                )}
                <h2 className="text-xl font-black tracking-tight">{category.name}</h2>
              </div>
              <div className={template === "premium" ? "grid gap-3" : "space-y-3"}>
                {category.items.filter((item) => item.name?.trim()).map((item) => (
                  <ItemCard
                    key={item.id}
                    category={category}
                    item={item}
                    menu={menu}
                    theme={theme}
                    compact={template === "compact"}
                    layout={productLayout}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      <MenuOrderWidget slug={qr.short_slug} menu={menu} initialTable={tableParam} />
    </main>
  );
}
