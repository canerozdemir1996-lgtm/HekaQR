export const MAX_BULK_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_BULK_ROWS = 5_000;
export const BULK_TEMPLATE_ROWS = [
  ["title", "type", "url", "ssid", "password", "security", "firstName", "lastName", "phone", "email", "company", "text", "subject", "body"],
  ["Yaz Kampanyası", "url", "https://example.com/yaz-kampanya", "", "", "", "", "", "", "", "", "", "", ""],
  ["Mağaza Wi-Fi", "wifi", "", "MagazaWifi", "sifre123", "WPA", "", "", "", "", "", "", "", ""],
  ["Ahmet Yılmaz", "vcard", "", "", "", "", "Ahmet", "Yılmaz", "+905551234567", "ahmet@example.com", "Acme A.Ş.", "", "", ""],
] as const;

export type BulkRowType = "url" | "wifi" | "vcard" | "phone" | "text" | "email" | "sms";

export interface BulkRow {
  title: string;
  type: BulkRowType;
  fields: Record<string, string>;
  is_active?: boolean;
  source_row?: number;
}

export interface BulkParseIssue {
  row: number;
  code: "EMPTY_FILE" | "MISSING_COLUMN" | "INVALID_TYPE" | "MISSING_VALUE" | "INVALID_VALUE" | "DUPLICATE_ROW" | "ROW_LIMIT";
  message: string;
}

export interface BulkParseResult {
  rows: BulkRow[];
  issues: BulkParseIssue[];
  headers: string[];
  table: string[][];
  mapping: BulkColumnMapping;
  sourceFormat: "csv" | "xlsx";
}

export const BULK_COLUMN_FIELDS = [
  { key: "title", label: "Başlık" },
  { key: "type", label: "QR Tipi" },
  { key: "url", label: "URL" },
  { key: "ssid", label: "Wi-Fi SSID" },
  { key: "password", label: "Wi-Fi Şifre" },
  { key: "security", label: "Wi-Fi Güvenlik" },
  { key: "firstName", label: "Ad" },
  { key: "lastName", label: "Soyad" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-posta" },
  { key: "company", label: "Şirket" },
  { key: "text", label: "Metin" },
  { key: "subject", label: "Konu" },
  { key: "body", label: "Mesaj" },
] as const;

export type BulkColumnKey = typeof BULK_COLUMN_FIELDS[number]["key"];
export type BulkColumnMapping = Partial<Record<BulkColumnKey, number>>;

const TYPE_ALIASES: Record<string, BulkRowType> = {
  url: "url", link: "url", website: "url",
  wifi: "wifi", "wi-fi": "wifi",
  vcard: "vcard", kartvizit: "vcard",
  phone: "phone", telefon: "phone", tel: "phone",
  text: "text", metin: "text",
  email: "email", "e-posta": "email", eposta: "email",
  sms: "sms",
};

const COLUMN_ALIASES = {
  title: ["title", "baslik", "name", "ad", "isim"],
  type: ["type", "tip", "tur"],
  url: ["url", "target_url", "link", "hedef", "website"],
  ssid: ["ssid", "ag", "network"],
  password: ["password", "sifre", "pass"],
  security: ["security", "guvenlik"],
  firstName: ["firstname", "first_name", "ad"],
  lastName: ["lastname", "last_name", "soyad"],
  phone: ["phone", "telefon", "tel"],
  email: ["email", "e-posta", "eposta"],
  company: ["company", "sirket", "firma"],
  text: ["text", "metin", "icerik"],
  subject: ["subject", "konu"],
  body: ["body", "message", "mesaj"],
} as const;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/["']/g, "")
    .replace(/\s+/g, "_");
}

function findColumn(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function cell(row: unknown[], index: number) {
  return index < 0 ? "" : String(row[index] ?? "").trim();
}

function fingerprint(row: BulkRow) {
  return JSON.stringify([row.title.toLocaleLowerCase("tr-TR"), row.type, row.fields]);
}

export function parseBulkTable(
  table: unknown[][],
  sourceFormat: "csv" | "xlsx",
  mappingOverride: BulkColumnMapping = {},
): BulkParseResult {
  const nonEmpty = table.filter((row) => row.some((value) => String(value ?? "").trim()));
  if (nonEmpty.length < 2) {
    return {
      rows: [], headers: [], table: [], mapping: mappingOverride, sourceFormat,
      issues: [{ row: 0, code: "EMPTY_FILE", message: "Dosya en az bir başlık ve bir veri satırı içermeli." }],
    };
  }

  const headers = nonEmpty[0].map(normalizeHeader);
  const autoMapping = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)]),
  ) as Record<keyof typeof COLUMN_ALIASES, number>;
  const columns = { ...autoMapping, ...mappingOverride };

  const issues: BulkParseIssue[] = [];
  if (columns.title < 0) {
    issues.push({ row: 1, code: "MISSING_COLUMN", message: '"title" sütunu zorunlu.' });
  }
  if (columns.type < 0 && columns.url < 0) {
    issues.push({ row: 1, code: "MISSING_COLUMN", message: '"url" veya "type" sütunlarından biri zorunlu.' });
  }
  const normalizedTable = nonEmpty.map(row => row.map(value => String(value ?? "")));
  if (issues.length) return { rows: [], issues, headers, table: normalizedTable, mapping: columns, sourceFormat };

  const dataRows = nonEmpty.slice(1, MAX_BULK_ROWS + 1);
  if (nonEmpty.length - 1 > MAX_BULK_ROWS) {
    issues.push({ row: MAX_BULK_ROWS + 2, code: "ROW_LIMIT", message: `Bir dosyada en fazla ${MAX_BULK_ROWS} veri satırı işlenebilir.` });
  }

  const rows: BulkRow[] = [];
  const seen = new Set<string>();

  dataRows.forEach((source, index) => {
    const rowNumber = index + 2;
    const title = cell(source, columns.title);
    if (!title) {
      issues.push({ row: rowNumber, code: "MISSING_VALUE", message: `Satır ${rowNumber}: Başlık boş.` });
      return;
    }

    const rawType = columns.type >= 0 ? normalizeHeader(cell(source, columns.type)) : "url";
    const type = TYPE_ALIASES[rawType || "url"];
    if (!type) {
      issues.push({ row: rowNumber, code: "INVALID_TYPE", message: `Satır ${rowNumber}: Geçersiz QR tipi "${rawType}".` });
      return;
    }

    let fields: Record<string, string>;
    if (type === "url") {
      const url = cell(source, columns.url);
      try {
        const parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocol");
      } catch {
        issues.push({ row: rowNumber, code: "INVALID_VALUE", message: `Satır ${rowNumber}: Geçerli bir http/https URL gerekli.` });
        return;
      }
      fields = { url };
    } else if (type === "wifi") {
      const ssid = cell(source, columns.ssid);
      if (!ssid) {
        issues.push({ row: rowNumber, code: "MISSING_VALUE", message: `Satır ${rowNumber}: Wi-Fi ağ adı (ssid) boş.` });
        return;
      }
      fields = {
        ssid,
        password: cell(source, columns.password),
        security: cell(source, columns.security) || "WPA",
      };
    } else if (type === "vcard") {
      fields = {
        firstName: cell(source, columns.firstName) || title,
        lastName: cell(source, columns.lastName),
        phone: cell(source, columns.phone),
        email: cell(source, columns.email),
        company: cell(source, columns.company),
      };
    } else if (type === "phone") {
      const phone = cell(source, columns.phone);
      if (!phone) {
        issues.push({ row: rowNumber, code: "MISSING_VALUE", message: `Satır ${rowNumber}: Telefon boş.` });
        return;
      }
      fields = { phone };
    } else if (type === "text") {
      const text = cell(source, columns.text);
      if (!text) {
        issues.push({ row: rowNumber, code: "MISSING_VALUE", message: `Satır ${rowNumber}: Metin boş.` });
        return;
      }
      fields = { text };
    } else if (type === "email") {
      const email = cell(source, columns.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issues.push({ row: rowNumber, code: "INVALID_VALUE", message: `Satır ${rowNumber}: Geçerli bir e-posta adresi gerekli.` });
        return;
      }
      fields = { email, subject: cell(source, columns.subject), body: cell(source, columns.body) };
    } else {
      const phone = cell(source, columns.phone);
      if (!phone) {
        issues.push({ row: rowNumber, code: "MISSING_VALUE", message: `Satır ${rowNumber}: Telefon boş.` });
        return;
      }
      fields = { phone, message: cell(source, columns.body) };
    }

    const normalized: BulkRow = { title, type, fields, is_active: true, source_row: rowNumber };
    const key = fingerprint(normalized);
    if (seen.has(key)) {
      issues.push({ row: rowNumber, code: "DUPLICATE_ROW", message: `Satır ${rowNumber}: Aynı dosyadaki yinelenen kayıt atlandı.` });
      return;
    }
    seen.add(key);
    rows.push(normalized);
  });

  return { rows, issues, headers, table: normalizedTable, mapping: columns, sourceFormat };
}

function detectDelimiter(firstLine: string) {
  const candidates = [",", ";", "\t"];
  return candidates.reduce((best, candidate) => {
    const count = firstLine.split(candidate).length - 1;
    return count > best.count ? { value: candidate, count } : best;
  }, { value: ",", count: -1 }).value;
}

export function parseDelimitedRows(text: string): string[][] {
  const delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

export function parseBulkCsv(text: string, mapping: BulkColumnMapping = {}) {
  return parseBulkTable(parseDelimitedRows(text.replace(/^\uFEFF/, "")), "csv", mapping);
}

export async function parseBulkWorkbook(buffer: ArrayBuffer, mapping: BulkColumnMapping = {}) {
  const { readSheet } = await import("read-excel-file/universal");
  const table = await readSheet(buffer);
  return parseBulkTable(table, "xlsx", mapping);
}

export function createBulkTemplateCsv() {
  return BULK_TEMPLATE_ROWS.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function createBulkTemplateXlsx() {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const blob = await writeXlsxFile(BULK_TEMPLATE_ROWS.map(row => [...row])).toBlob();
  return blob.arrayBuffer();
}

export async function parseBulkFile(file: File): Promise<BulkParseResult> {
  if (file.size > MAX_BULK_FILE_BYTES) {
    return {
      rows: [], headers: [], sourceFormat: /\.xlsx?$/i.test(file.name) ? "xlsx" : "csv",
      table: [], mapping: {},
      issues: [{ row: 0, code: "INVALID_VALUE", message: "Dosya boyutu 10 MB sınırını aşıyor." }],
    };
  }
  if (/\.xlsx?$/i.test(file.name)) return await parseBulkWorkbook(await file.arrayBuffer());
  return parseBulkCsv(await file.text());
}
