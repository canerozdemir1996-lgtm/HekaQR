"use client";

import React, { useEffect, useState } from "react";
import { Button, getButtonClass } from "@/lib/button-system-2026";
import { getSupabase, type QrCode } from "@/lib/supabase";
import { 
  Edit2, BarChart2, Trash2, Globe, Wifi, Search,
  User, ExternalLink, Copy, Check, MoreVertical
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import Link from "next/link";

export function ModernQRList({ onEdit }: { onEdit?: (qr: QrCode) => void }) {
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQRs();
  }, []);

  async function fetchQRs() {
    try {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { data, error } = await sb
        .from("qr_codes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQrs(data || []);
    } catch (error) {
      console.error("QR'lar çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = async (slug: string, id: string) => {
    const url = `${window.location.origin}/q/${slug}`;
    await copyToClipboard(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu QR kodu kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
      const sb = getSupabase();
      const { error } = await sb.from("qr_codes").delete().eq("id", id);
      if (error) throw error;

      setQrs((prev) => prev.filter((qr) => qr.id !== id));
    } catch (error) {
      console.error("Silme işlemi başarısız:", error);
      alert("QR kod silinirken bir hata oluştu.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "url": return <Globe size={18} className="text-violet-500" />;
      case "vcard": return <User size={18} className="text-emerald-500" />;
      case "wifi": return <Wifi size={18} className="text-cyan-500" />;
      default: return <Globe size={18} className="text-slate-500" />;
    }
  };

  const filteredQrs = qrs.filter(
    (qr) =>
      qr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qr.short_slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (qrs.length === 0) {
    return (
      <div className="surface rounded-3xl p-12 flex flex-col items-center justify-center text-center border-dashed border-2">
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
          <Globe className="text-slate-400" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Henüz QR Kodunuz Yok</h3>
        <p className="text-slate-500 max-w-sm mb-6">İlk kampanyanızı oluşturarak hedef kitlenizle bağlantı kurmaya başlayın.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Arama ve Filtreleme Alanı */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-slate-400" size={18} />
        </div>
        <input
          type="text"
          placeholder="QR kodlarda ara (Başlık veya kısa link)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/50 dark:bg-black/20 backdrop-blur-md border-slate-200 dark:border-white/10 text-sm outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
        />
      </div>

      {/* Arama Sonucu Bulunamadıysa */}
      {filteredQrs.length === 0 && qrs.length > 0 && (
        <div className="text-center py-10 text-slate-500 font-medium">
          "{searchQuery}" aramasına uygun QR kod bulunamadı.
        </div>
      )}

      {filteredQrs.map((qr) => (
        <div 
          key={qr.id} 
          className="group surface flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl gap-4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-violet-500/10 hover:-translate-y-0.5 border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md"
        >
          {/* Sol Kısım: İkon ve Bilgiler */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
              {getIcon(qr.qr_type || "url")}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {qr.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 truncate max-w-[150px]">
                  hekaqr.com/q/{qr.short_slug}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${qr.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${qr.is_active ? "bg-emerald-500" : "bg-slate-500"}`} />
                  {qr.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
            </div>
          </div>

          {/* Sağ Kısım: İstatistikler ve Aksiyonlar */}
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-slate-100 dark:border-white/10 pt-3 sm:pt-0">
            
            {/* Tarama Sayısı */}
            <div className="text-center sm:text-right">
              <p className="text-xs font-medium text-slate-500">Taramalar</p>
              <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {(qr.scan_count || 0).toLocaleString("tr-TR")}
              </p>
            </div>

            {/* Butonlar */}
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg text-slate-500 hover:text-violet-500 hover:bg-violet-500/10" onClick={() => handleCopy(qr.short_slug, qr.id)} title="Linki Kopyala">
                {copiedId === qr.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </Button>
              <Link href={`/dashboard/analytics/${qr.id}`} className={getButtonClass("ghost", "sm", true) + " h-9 w-9 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-blue-500/10"} title="İstatistikler">
                <BarChart2 size={16} />
              </Link>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-amber-500/10" onClick={() => onEdit?.(qr)} title="Düzenle">
                <Edit2 size={16} />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(qr.id)} title="Sil">
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}