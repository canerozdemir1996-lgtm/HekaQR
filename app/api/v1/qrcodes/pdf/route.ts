import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { resolveQrRenderData } from "@/lib/qr-render-data";
import { renderQrPngBuffer } from "@/lib/qr-render";

export const dynamic = "force-dynamic";

const IMAGE_SIZE = 600;
const PAGE_WIDTH = 420;
const PAGE_HEIGHT = 560;
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const GRID_COLS = 2;
const GRID_CARD = 240;
const GRID_GAP = 30;
const GRID_MARGIN = 38;

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function buildSinglePdf(title: string, link: string, pngBuffer: Buffer) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const png = await pdfDoc.embedPng(pngBuffer);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(1, 1, 1) });

  const titleText = truncate(title, 36);
  const titleSize = 20;
  const titleWidth = font.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, { x: (PAGE_WIDTH - titleWidth) / 2, y: PAGE_HEIGHT - 70, size: titleSize, font, color: rgb(0.06, 0.09, 0.16) });

  const imgSize = 280;
  page.drawImage(png, { x: (PAGE_WIDTH - imgSize) / 2, y: PAGE_HEIGHT - 70 - 40 - imgSize, width: imgSize, height: imgSize });

  const linkText = truncate(link, 48);
  const linkSize = 9;
  const linkWidth = monoFont.widthOfTextAtSize(linkText, linkSize);
  page.drawText(linkText, { x: (PAGE_WIDTH - linkWidth) / 2, y: PAGE_HEIGHT - 70 - 40 - imgSize - 30, size: linkSize, font: monoFont, color: rgb(0.4, 0.45, 0.53) });

  return pdfDoc.save();
}

async function buildBulkPdf(items: { title: string; link: string; png: Buffer }[]) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const perPage = GRID_COLS * 3;
  for (let pageStart = 0; pageStart < items.length; pageStart += perPage) {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT, color: rgb(1, 1, 1) });

    const pageItems = items.slice(pageStart, pageStart + perPage);
    for (let i = 0; i < pageItems.length; i += 1) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cardX = GRID_MARGIN + col * (GRID_CARD + GRID_GAP);
      const cardTopY = A4_HEIGHT - GRID_MARGIN - row * (GRID_CARD + 90);

      const { title, link, png } = pageItems[i];
      const pngImage = await pdfDoc.embedPng(png);

      const titleText = truncate(title, 28);
      const titleSize = 12;
      const titleWidth = font.widthOfTextAtSize(titleText, titleSize);
      page.drawText(titleText, { x: cardX + (GRID_CARD - titleWidth) / 2, y: cardTopY - 14, size: titleSize, font, color: rgb(0.06, 0.09, 0.16) });

      page.drawImage(pngImage, { x: cardX + (GRID_CARD - GRID_CARD * 0.82) / 2, y: cardTopY - 24 - GRID_CARD * 0.82, width: GRID_CARD * 0.82, height: GRID_CARD * 0.82 });

      const linkText = truncate(link, 34);
      const linkSize = 7;
      const linkWidth = monoFont.widthOfTextAtSize(linkText, linkSize);
      page.drawText(linkText, { x: cardX + (GRID_CARD - linkWidth) / 2, y: cardTopY - 24 - GRID_CARD * 0.82 - 16, size: linkSize, font: monoFont, color: rgb(0.4, 0.45, 0.53) });
    }
  }

  return pdfDoc.save();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const slug = (searchParams.get("slug") ?? "").trim();
    const slugsRaw = (searchParams.get("slugs") ?? "").trim();
    const slugs = slugsRaw ? slugsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100) : [];

    if (!slug && slugs.length === 0) {
      return NextResponse.json({ error: "slug veya slugs zorunlu" }, { status: 400 });
    }

    if (slug) {
      const resolved = await resolveQrRenderData(req.nextUrl.origin, slug);
      if (!resolved) return NextResponse.json({ error: "QR bulunamadı" }, { status: 404 });
      const png = await renderQrPngBuffer(resolved.payload, resolved.styleConfig, IMAGE_SIZE);
      const pdfBytes = await buildSinglePdf(resolved.title, resolved.link, png as Buffer);
      return new NextResponse(pdfBytes as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${resolved.title.replace(/[^a-z0-9-_]+/gi, "-")}.pdf"`,
        },
      });
    }

    const resolvedItems = await Promise.all(slugs.map((s) => resolveQrRenderData(req.nextUrl.origin, s)));
    const items = await Promise.all(
      resolvedItems
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map(async (r) => ({ title: r.title, link: r.link, png: (await renderQrPngBuffer(r.payload, r.styleConfig, IMAGE_SIZE)) as Buffer }))
    );

    if (items.length === 0) return NextResponse.json({ error: "QR bulunamadı" }, { status: 404 });

    const pdfBytes = await buildBulkPdf(items);
    return new NextResponse(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="qr-publish-toplu.pdf"`,
      },
    });
  } catch (error) {
    console.error("QR pdf error:", error);
    return NextResponse.json({ error: "PDF oluşturulamadı." }, { status: 500 });
  }
}
