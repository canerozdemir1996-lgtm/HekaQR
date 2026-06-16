import { getSupabase } from "@/lib/supabase";
import { validateInput } from "@/lib/schemas/validationSchemas";
import { createQrCodeSchema, updateQrCodeSchema, type CreateQrCodeInput, type UpdateQrCodeInput } from "@/lib/schemas/validationSchemas";
import { AppError, errors } from "@/lib/middleware/errorHandler";

// ─── QR Code Service ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QRCodeServiceClass {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (!this.isCacheValid(entry)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  clearCache() {
    this.cache.clear();
  }

  async createQrCode(input: CreateQrCodeInput, userId?: string) {
    try {
      // Validate input
      const validated = validateInput(createQrCodeSchema, input);

      const sb = getSupabase();
      const row = {
        ...validated,
        scan_count: 0,
        ...(userId && { user_id: userId }),
      };

      const { data, error } = await sb.from("qr_codes").insert([row]).select().single();

      if (error) throw error;

      // Clear list cache
      this.cache.delete("qr_list_*");

      return data;
    } catch (e) {
      if (e instanceof Error) {
        throw errors.internalError(e.message);
      }
      throw errors.internalError();
    }
  }

  async getQrCode(id: string | null | undefined) {
    if (!id) throw errors.notFound("QR Code");

    // Check cache
    const cached = this.getCache(`qr_${id}`);
    if (cached) return cached;

    try {
      const sb = getSupabase();
      const { data, error } = await sb.from("qr_codes").select("*").eq("id", id).single();

      if (error || !data) throw errors.notFound("QR Code");

      this.setCache(`qr_${id}`, data);
      return data;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw errors.internalError();
    }
  }

  async getQrCodeBySlug(slug: string) {
    if (!slug) throw errors.notFound("QR Code");

    // Check cache
    const cached = this.getCache(`qr_slug_${slug}`);
    if (cached) return cached;

    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("qr_codes")
        .select("*")
        .ilike("short_slug", slug)
        .maybeSingle();

      if (error || !data) throw errors.notFound("QR Code");

      this.setCache(`qr_slug_${slug}`, data);
      return data;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw errors.internalError();
    }
  }

  async updateQrCode(id: string, input: UpdateQrCodeInput) {
    if (!id) throw errors.notFound("QR Code");

    try {
      // Validate input
      const validated = validateInput(updateQrCodeSchema, input);

      const sb = getSupabase();
      const { data, error } = await sb
        .from("qr_codes")
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error || !data) throw error || errors.notFound("QR Code");

      // Invalidate cache
      this.cache.delete(`qr_${id}`);
      this.cache.delete(`qr_slug_${data.short_slug}`);
      this.cache.delete("qr_list_*");

      return data;
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (e instanceof Error) throw errors.internalError(e.message);
      throw errors.internalError();
    }
  }

  async deleteQrCode(id: string) {
    if (!id) throw errors.notFound("QR Code");

    try {
      const sb = getSupabase();
      const qr = await this.getQrCode(id);

      const { error } = await sb.from("qr_codes").delete().eq("id", id);

      if (error) throw error;

      // Invalidate cache
      this.cache.delete(`qr_${id}`);
      this.cache.delete(`qr_slug_${qr.short_slug}`);
      this.cache.delete("qr_list_*");
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (e instanceof Error) throw errors.internalError(e.message);
      throw errors.internalError();
    }
  }

  async toggleQrActive(id: string, isActive: boolean) {
    return this.updateQrCode(id, { is_active: isActive });
  }

  async incrementScanCount(id: string) {
    try {
      const sb = getSupabase();
      const qr = await this.getQrCode(id);

      const { error } = await sb
        .from("qr_codes")
        .update({ scan_count: qr.scan_count + 1 })
        .eq("id", id);

      if (error) throw error;

      // Invalidate cache
      this.cache.delete(`qr_${id}`);
    } catch (e) {
      // Silently fail - don't break the redirect if scan count update fails
      console.error("Failed to increment scan count:", e);
    }
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeServiceClass();
