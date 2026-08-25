import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";
import { checkRateLimit, clientIp, RATE_LIMITS, tooManyRequestsResponse } from "@/lib/rateLimit";
import { uploadContentIsValid, uploadExtensionForMime, uploadRequestSizeError } from "@/lib/upload-validation";

export const dynamic = "force-dynamic";

const BUCKET = "hekaqr-assets";
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
const DOC_MIME_TYPES = ["application/pdf"];
const ALL_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOC_MIME_TYPES];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_DOC_BYTES + 512 * 1024;

async function ensureBucket() {
  const sb = sbAdmin();
  const { data } = await sb.storage.getBucket(BUCKET);
  if (data) {
    // Bucket önceden sadece görsel mimetype'larıyla oluşturulmuş olabilir —
    // PDF desteği eklendiğinde mevcut bucket'ın izin listesini güncelle.
    await sb.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_DOC_BYTES}`,
      allowedMimeTypes: ALL_MIME_TYPES,
    }).catch(() => {});
    return sb;
  }

  const { error } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_DOC_BYTES}`,
    allowedMimeTypes: ALL_MIME_TYPES,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
  return sb;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authRequest(req);
    if (!auth) return NextResponse.json({ error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." }, { status: 401 });

    const ip = clientIp(req);
    if (!checkRateLimit(`upload:${auth.userId}:${ip}`, RATE_LIMITS.UPLOAD.max, RATE_LIMITS.UPLOAD.windowMs)) {
      return tooManyRequestsResponse();
    }
    const requestSizeError = uploadRequestSizeError(req.headers, MAX_MULTIPART_BYTES);
    if (requestSizeError) return NextResponse.json({ error: requestSizeError.error }, { status: requestSizeError.status });

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") || "general").replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || "general";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }
    if (!ALL_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "PNG, JPG, WEBP, GIF, AVIF veya PDF yükleyin." }, { status: 400 });
    }
    const isDoc = DOC_MIME_TYPES.includes(file.type);
    const maxBytes = isDoc ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: isDoc ? "Dosya 15 MB'den küçük olmalı." : "Görsel 5 MB'den küçük olmalı." }, { status: 400 });
    }

    const ext = uploadExtensionForMime(file.type);
    if (!ext) return NextResponse.json({ error: "Desteklenmeyen dosya türü." }, { status: 400 });
    const path = `${auth.userId}/${folder}/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!(await uploadContentIsValid(bytes, file.type))) {
      return NextResponse.json({ error: "Dosya içeriği bildirilen dosya türüyle eşleşmiyor." }, { status: 400 });
    }

    const sb = await ensureBucket();
    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || `image/${ext}`,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.error("[uploads] storage upload failed", error);
      return NextResponse.json({ error: "Dosya yüklenemedi." }, { status: 400 });
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (err) {
    console.error("[uploads] unexpected error", err);
    return NextResponse.json(
      { error: "Dosya yüklenemedi." },
      { status: 500 },
    );
  }
}
