"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Eraser, ImagePlus, Loader2 } from "lucide-react";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Basit contentEditable tabanlı zengin metin editörü. document.execCommand
// deprecated olsa da kalın/italik/altı çizili/liste/resim için tüm güncel
// tarayıcılarda hâlâ çalışıyor — bu kapsam (kısa bildirim metni) için harici
// bir editör kütüphanesi (Quill/TipTap) eklemeye değmez.
export function RichTextEditor({
  value,
  onChange,
  isDark,
  placeholder,
  maxLength,
  onError,
}: {
  value: string;
  onChange: (html: string, plainTextLength: number) => void;
  isDark: boolean;
  placeholder?: string;
  maxLength: number;
  onError?: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Tarayıcı varsayılanı Enter'da <div> sarmalıyor — sanitizeHtml izin verilen
  // etiket listesinde div yok, bu yüzden literal "<div>" metni olarak görünür.
  // Bunun yerine düz <br> üretmesini söylüyoruz (liste davranışını etkilemez).
  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "br");
  }, []);

  // Dışarıdan value sıfırlanırsa (modal yeniden açıldığında) DOM'u senkronla.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (!ref.current) return;
    onChange(ref.current.innerHTML, ref.current.textContent?.length ?? 0);
  }, [onChange]);

  const exec = useCallback((command: string) => {
    ref.current?.focus();
    document.execCommand(command);
    emitChange();
  }, [emitChange]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const len = ref.current?.textContent?.length ?? 0;
    const isTyping = e.key.length === 1 || e.key === "Enter";
    if (isTyping && len >= maxLength) e.preventDefault();
  }, [maxLength]);

  const onPickImage = useCallback(() => fileInputRef.current?.click(), []);

  const onImageSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      onError?.("PNG, JPG, WEBP, GIF veya AVIF yükleyin.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError?.("Görsel 5 MB'den küçük olmalı.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", "admin-messages");
      const res = await fetch("/api/v1/uploads", { method: "POST", body: form, credentials: "same-origin" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) throw new Error(json?.error ?? "Görsel yüklenemedi.");

      ref.current?.focus();
      document.execCommand("insertImage", false, json.url);
      emitChange();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }, [emitChange, onError]);

  const btn = isDark
    ? "text-slate-400 hover:text-white hover:bg-white/10"
    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100";

  return (
    <div>
      <div className={`flex items-center gap-1 p-1 rounded-t-xl border-b-0 border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
        <button type="button" title="Kalın" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} className={`p-1.5 rounded-lg transition-all ${btn}`}><Bold size={13} /></button>
        <button type="button" title="İtalik" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} className={`p-1.5 rounded-lg transition-all ${btn}`}><Italic size={13} /></button>
        <button type="button" title="Altı çizili" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} className={`p-1.5 rounded-lg transition-all ${btn}`}><Underline size={13} /></button>
        <span className={`w-px h-4 mx-0.5 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
        <button type="button" title="Madde listesi" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} className={`p-1.5 rounded-lg transition-all ${btn}`}><List size={13} /></button>
        <button type="button" title="Numaralı liste" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} className={`p-1.5 rounded-lg transition-all ${btn}`}><ListOrdered size={13} /></button>
        <span className={`w-px h-4 mx-0.5 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
        <button type="button" title="Görsel ekle" disabled={uploading} onMouseDown={(e) => { e.preventDefault(); onPickImage(); }} className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${btn}`}>
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
        </button>
        <span className={`w-px h-4 mx-0.5 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
        <button type="button" title="Biçimlendirmeyi temizle" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }} className={`p-1.5 rounded-lg transition-all ${btn}`}><Eraser size={13} /></button>
        <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={onImageSelected} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          // Zengin yapıştırmayı düz metne indir — script/style/attribute taşıyan
          // dış kaynaklı HTML'in editöre sızmasını engeller.
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          emitChange();
        }}
        data-placeholder={placeholder}
        className={`rich-editor w-full border rounded-b-xl px-3.5 py-2.5 text-sm outline-none transition-all min-h-[100px] max-h-60 overflow-y-auto ${
          isDark
            ? "bg-white/5 border-white/10 text-white focus:border-violet-500"
            : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-400"
        }`}
      />
      <style jsx>{`
        .rich-editor:empty:before {
          content: attr(data-placeholder);
          color: ${isDark ? "#475569" : "#94a3b8"};
        }
        .rich-editor ul, .rich-editor ol {
          padding-left: 1.25rem;
        }
        .rich-editor img {
          max-width: 100%;
          border-radius: 8px;
          display: block;
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
}
