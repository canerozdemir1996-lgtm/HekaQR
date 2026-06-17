export type MultiLinkTemplate = "midnight" | "sunrise" | "studio" | "forest";

export interface MultiLinkItem {
  id: string;
  title: string;
  description: string;
  url: string;
}

export interface MultiLinkData {
  kind: "multi";
  template: MultiLinkTemplate;
  profileName: string;
  headline: string;
  subheadline: string;
  avatar: string;
  coverImage: string;
  accentColor: string;
  backgroundColor: string;
  showProfile: boolean;
  showLinks: boolean;
  showContact: boolean;
  links: MultiLinkItem[];
  contactTitle: string;
  contactDescription: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsapp: string;
  primaryButtonLabel: string;
  primaryButtonUrl: string;
}

export const MULTI_LINK_TEMPLATES: Array<{
  id: MultiLinkTemplate;
  title: string;
  desc: string;
  preview: string;
}> = [
  {
    id: "midnight",
    title: "Midnight",
    desc: "Koyu premium vitrin",
    preview: "linear-gradient(145deg, #061325 0%, #0f172a 58%, #1d4ed8 100%)",
  },
  {
    id: "sunrise",
    title: "Sunrise",
    desc: "Aydinlik ve sicak tonlar",
    preview: "linear-gradient(145deg, #fff7ed 0%, #fde68a 52%, #f97316 100%)",
  },
  {
    id: "studio",
    title: "Studio",
    desc: "Temiz ve editor tarzi",
    preview: "linear-gradient(145deg, #f8fafc 0%, #dbeafe 52%, #6366f1 100%)",
  },
  {
    id: "forest",
    title: "Forest",
    desc: "Dogal ve guven veren",
    preview: "linear-gradient(145deg, #052e16 0%, #166534 48%, #a3e635 100%)",
  },
];

export function createMultiLinkItem(seed?: Partial<MultiLinkItem>): MultiLinkItem {
  return {
    id: seed?.id ?? `link-${Math.random().toString(36).slice(2, 10)}`,
    title: seed?.title ?? "",
    description: seed?.description ?? "",
    url: seed?.url ?? "",
  };
}

export function createEmptyMultiLinkData(): MultiLinkData {
  return {
    kind: "multi",
    template: "midnight",
    profileName: "",
    headline: "",
    subheadline: "",
    avatar: "",
    coverImage: "",
    accentColor: "#4f6cf7",
    backgroundColor: "#0f172a",
    showProfile: true,
    showLinks: true,
    showContact: false,
    links: [
      createMultiLinkItem({
        title: "Ana Web Sitesi",
        description: "Kampanya ve urunleri kesfedin",
        url: "https://example.com",
      }),
      createMultiLinkItem({
        title: "WhatsApp Siparis",
        description: "Hizli destek ve siparis hatti",
        url: "https://wa.me/905555555555",
      }),
    ],
    contactTitle: "Iletisim",
    contactDescription: "Form, telefon veya WhatsApp ile bize ulasin.",
    contactPhone: "",
    contactEmail: "",
    contactWhatsapp: "",
    primaryButtonLabel: "",
    primaryButtonUrl: "",
  };
}

export function normalizeMultiLinkData(input: unknown): MultiLinkData {
  const base = createEmptyMultiLinkData();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return base;
  }

  const raw = input as Partial<MultiLinkData> & { links?: unknown };
  const rawLinks = Array.isArray(raw.links) ? raw.links : [];

  return {
    ...base,
    ...raw,
    kind: "multi",
    links: rawLinks.length
      ? rawLinks.map((item, index) => {
          const link = item && typeof item === "object" ? (item as Partial<MultiLinkItem>) : {};
          return createMultiLinkItem({
            id: link.id ?? `link-${index + 1}`,
            title: typeof link.title === "string" ? link.title : "",
            description: typeof link.description === "string" ? link.description : "",
            url: typeof link.url === "string" ? link.url : "",
          });
        })
      : base.links,
  };
}
