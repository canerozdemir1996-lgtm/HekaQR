import {
  ChevronRight,
  ExternalLink,
  Link2,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  MULTI_LINK_TEMPLATES,
  normalizeMultiLinkData,
  type MultiLinkData,
  type MultiLinkItem,
} from "@/lib/multi-link";

type Props = {
  data: MultiLinkData;
  title?: string;
  preview?: boolean;
};

function getTheme(data: MultiLinkData) {
  const accent = data.accentColor || "#4f6cf7";
  const themes = {
    midnight: {
      shell: "linear-gradient(155deg, #091224 0%, #0f172a 45%, #1d4ed8 100%)",
      overlay: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 58%, rgba(255,255,255,0.12) 100%)",
      text: "#ffffff",
      muted: "rgba(255,255,255,0.76)",
      panelText: "#0f172a",
      panelMuted: "#475569",
      badge: "#f8d95f",
      buttonText: "#ffffff",
    },
    sunrise: {
      shell: "linear-gradient(155deg, #fff7ed 0%, #fde68a 46%, #fb923c 100%)",
      overlay: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.18) 100%)",
      text: "#7c2d12",
      muted: "rgba(124,45,18,0.72)",
      panelText: "#7c2d12",
      panelMuted: "#9a3412",
      badge: "#ffffff",
      buttonText: "#7c2d12",
    },
    studio: {
      shell: "linear-gradient(155deg, #e0e7ff 0%, #dbeafe 50%, #6366f1 100%)",
      overlay: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.18) 100%)",
      text: "#1e1b4b",
      muted: "rgba(30,27,75,0.68)",
      panelText: "#1e293b",
      panelMuted: "#475569",
      badge: "#ffffff",
      buttonText: "#1e1b4b",
    },
    forest: {
      shell: "linear-gradient(155deg, #052e16 0%, #166534 48%, #84cc16 100%)",
      overlay: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 58%, rgba(255,255,255,0.16) 100%)",
      text: "#ecfccb",
      muted: "rgba(236,252,203,0.72)",
      panelText: "#14532d",
      panelMuted: "#3f6212",
      badge: "#d9f99d",
      buttonText: "#14532d",
    },
  } as const;

  return { accent, ...(themes[data.template] ?? themes.midnight) };
}

function initials(value: string) {
  const parts = value.split(" ").filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "QR";
}

function LinkCard({
  item,
  preview,
  accent,
  panelText,
  panelMuted,
}: {
  item: MultiLinkItem;
  preview: boolean;
  accent: string;
  panelText: string;
  panelMuted: string;
}) {
  const content = (
    <div
      className="group flex items-center gap-3 rounded-[1.35rem] border border-black/5 bg-white/95 px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-0.5"
      style={{ color: panelText }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${accent}14`, color: accent }}
      >
        <Link2 size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{item.title || "Baslik"}</p>
        <p className="truncate text-xs font-semibold" style={{ color: panelMuted }}>
          {item.description || "Daha fazla bilgi icin ziyaret edin"}
        </p>
      </div>
      <ChevronRight size={18} style={{ color: accent }} />
    </div>
  );

  if (preview) {
    return content;
  }

  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="block">
      {content}
    </a>
  );
}

export default function MultiLinkPageView({ data, title, preview = false }: Props) {
  const page = normalizeMultiLinkData(data);
  const theme = getTheme(page);
  const profileName = page.profileName.trim() || title || "Sayfa Adi";
  const headline = page.headline.trim() || "Description";
  const subheadline = page.subheadline.trim() || "Extra information";
  const linkItems = page.links.filter((item) => item.title.trim() || item.url.trim());
  const publicLinks = linkItems.filter((item) => item.url.trim());
  const visibleLinks = preview ? linkItems : publicLinks;
  const templateLabel = MULTI_LINK_TEMPLATES.find((item) => item.id === page.template)?.title ?? "Midnight";

  const phoneFrame = (
    <div
      className="relative overflow-hidden rounded-[2rem] border-[6px] border-slate-900/85 shadow-[0_35px_80px_rgba(15,23,42,0.28)]"
      style={{ background: theme.shell }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{ backgroundImage: theme.overlay }} />
      <div className="pointer-events-none absolute left-1/2 top-0 h-6 w-36 -translate-x-1/2 rounded-b-[1.1rem] bg-slate-950/90" />
      {page.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      ) : null}
      <div className="relative flex min-h-[640px] flex-col px-5 pb-5 pt-8">
        <div className="mb-7 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em]">
          <span style={{ color: theme.muted }}>{templateLabel}</span>
          <span style={{ color: theme.muted }}>HekaQR</span>
        </div>

        {page.showProfile ? (
          <div className="px-2 text-center">
            <div
              className="mx-auto mb-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 shadow-2xl"
              style={{ background: theme.badge, borderColor: "rgba(255,255,255,0.16)" }}
            >
              {page.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.avatar} alt={profileName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-black" style={{ color: theme.buttonText }}>
                  {initials(profileName)}
                </span>
              )}
            </div>
            <h1 className="text-[2rem] font-black tracking-tight" style={{ color: theme.text }}>
              {profileName}
            </h1>
            <p className="mt-2 text-base font-semibold" style={{ color: theme.muted }}>
              {headline}
            </p>
            <p className="text-sm font-semibold" style={{ color: theme.muted }}>
              {subheadline}
            </p>
          </div>
        ) : null}

        {page.primaryButtonLabel.trim() && page.primaryButtonUrl.trim() ? (
          preview ? (
            <div className="mt-6 rounded-2xl px-4 py-3 text-center text-sm font-black shadow-lg" style={{ background: theme.accent, color: theme.buttonText }}>
              {page.primaryButtonLabel}
            </div>
          ) : (
            <a
              href={page.primaryButtonUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow-lg"
              style={{ background: theme.accent, color: theme.buttonText }}
            >
              {page.primaryButtonLabel}
              <ExternalLink size={16} />
            </a>
          )
        ) : null}

        {page.showLinks ? (
          <div className="mt-6 space-y-3">
            {visibleLinks.length > 0 ? (
              visibleLinks.map((item) => (
                <LinkCard
                  key={item.id}
                  item={item}
                  preview={preview}
                  accent={theme.accent}
                  panelText={theme.panelText}
                  panelMuted={theme.panelMuted}
                />
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-white/20 px-4 py-6 text-center text-sm font-semibold text-white/70">
                Ilk linkinizi eklediginizde burada gosterilecek.
              </div>
            )}
          </div>
        ) : null}

        {page.showContact ? (
          <div className="mt-auto pt-6">
            <div
              className="rounded-[1.5rem] border border-white/10 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
              style={{ background: "rgba(255,255,255,0.10)", color: theme.text }}
            >
              <p className="text-sm font-black">{page.contactTitle || "Iletisim"}</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: theme.muted }}>
                {page.contactDescription || "Bize ulasmak icin asagidaki kanallari kullanin."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {page.contactPhone.trim() ? (
                  preview ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black">
                      <Phone size={13} />
                      {page.contactPhone}
                    </span>
                  ) : (
                    <a href={`tel:${page.contactPhone}`} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black">
                      <Phone size={13} />
                      {page.contactPhone}
                    </a>
                  )
                ) : null}
                {page.contactEmail.trim() ? (
                  preview ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black">
                      <Mail size={13} />
                      {page.contactEmail}
                    </span>
                  ) : (
                    <a href={`mailto:${page.contactEmail}`} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black">
                      <Mail size={13} />
                      {page.contactEmail}
                    </a>
                  )
                ) : null}
                {page.contactWhatsapp.trim() ? (
                  preview ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black">
                      <MessageCircle size={13} />
                      WhatsApp
                    </span>
                  ) : (
                    <a href={page.contactWhatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 text-xs font-black">
                      <MessageCircle size={13} />
                      WhatsApp
                    </a>
                  )
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (preview) {
    return <div className="mx-auto w-full max-w-[340px]">{phoneFrame}</div>;
  }

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ background: `radial-gradient(circle at top, ${theme.accent}22 0%, transparent 28%), ${page.backgroundColor || "#020617"}` }}
    >
      <div className="mx-auto max-w-md">{phoneFrame}</div>
    </div>
  );
}
