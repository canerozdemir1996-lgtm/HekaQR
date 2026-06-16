import { getSupabase } from "@/lib/supabase";
import { errors } from "@/lib/middleware/errorHandler";
import crypto from "crypto";

// ─── Analytics Service ────────────────────────────────────────────────────────

export interface ScanAnalytics {
  total_scans: number;
  unique_scans: number;
  scans_today: number;
  devices: Record<string, number>;
  os: Record<string, number>;
  countries: Record<string, number>;
}

export interface DailyStat {
  day: string;
  count: number;
}

class AnalyticsServiceClass {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }

  async recordScan(qrId: string, params: {
    device: string;
    os: string;
    userAgent: string;
    ip?: string;
    country?: string;
  }) {
    const sb = getSupabase();

    try {
      // Calculate unique fingerprint
      const day = new Date().toISOString().slice(0, 10);
      const fingerprint = crypto
        .createHash("sha256")
        .update(`${qrId}|${day}|${params.ip || ""}|${params.userAgent.slice(0, 128)}`)
        .digest("hex");

      const { error } = await sb.from("scan_logs").insert({
        qr_id: qrId,
        device: params.device,
        os: params.os,
        user_agent: params.userAgent.slice(0, 512),
        ip_hash: params.ip ? crypto.createHash("sha256").update(params.ip).digest("hex") : null,
        fingerprint,
        country: params.country ?? null,
      });

      if (error) throw error;

      // Invalidate analytics cache
      this.cache.delete(`analytics_${qrId}`);
      this.cache.delete("dashboard_stats");
    } catch (e) {
      console.error("Failed to record scan:", e);
      // Don't throw - scanning should not fail if analytics fails
    }
  }

  async getQrAnalytics(qrId: string): Promise<ScanAnalytics> {
    // Check cache
    const cached = this.getCache<ScanAnalytics>(`analytics_${qrId}`);
    if (cached) return cached;

    try {
      const sb = getSupabase();

      // Get all scans for this QR
      const { data: scans, error } = await sb
        .from("scan_logs")
        .select("device, os, country, created_at")
        .eq("qr_id", qrId);

      if (error) throw error;

      const today = new Date().toISOString().slice(0, 10);

      const analytics: ScanAnalytics = {
        total_scans: scans?.length ?? 0,
        unique_scans: new Set(scans?.map((s) => s.country) || []).size,
        scans_today: scans?.filter((s) => s.created_at?.startsWith(today)).length ?? 0,
        devices: {},
        os: {},
        countries: {},
      };

      // Aggregate data
      for (const scan of scans ?? []) {
        if (scan.device) {
          analytics.devices[scan.device] = (analytics.devices[scan.device] ?? 0) + 1;
        }
        if (scan.os) {
          analytics.os[scan.os] = (analytics.os[scan.os] ?? 0) + 1;
        }
        if (scan.country) {
          analytics.countries[scan.country] = (analytics.countries[scan.country] ?? 0) + 1;
        }
      }

      this.setCache(`analytics_${qrId}`, analytics);
      return analytics;
    } catch (e) {
      console.error("Failed to get QR analytics:", e);
      throw errors.internalError();
    }
  }

  async getDailyStats(qrId: string, days: number = 30): Promise<DailyStat[]> {
    try {
      const sb = getSupabase();

      const { data, error } = await sb
        .from("scan_logs")
        .select("created_at")
        .eq("qr_id", qrId)
        .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = new Map<string, number>();

      for (const scan of data ?? []) {
        const day = scan.created_at.slice(0, 10);
        stats.set(day, (stats.get(day) ?? 0) + 1);
      }

      return Array.from(stats.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => a.day.localeCompare(b.day));
    } catch (e) {
      console.error("Failed to get daily stats:", e);
      throw errors.internalError();
    }
  }

  async getDashboardStats(userId?: string) {
    const cacheKey = userId ? `dashboard_stats_${userId}` : "dashboard_stats";

    // Check cache
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const sb = getSupabase();

      let qrsQuery = sb.from("qr_codes").select("id, is_active, scan_count");
      if (userId) {
        qrsQuery = qrsQuery.eq("user_id", userId);
      }

      const { data: qrs, error } = await qrsQuery;
      if (error) throw error;

      const stats = {
        total_qr: qrs?.length ?? 0,
        active_qr: qrs?.filter((q) => q.is_active).length ?? 0,
        total_scans: qrs?.reduce((sum, q) => sum + q.scan_count, 0) ?? 0,
        scans_today: 0, // Would need more complex query
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (e) {
      console.error("Failed to get dashboard stats:", e);
      throw errors.internalError();
    }
  }

  // ─── Advanced Analytics Methods ───────────────────────────────────────────

  /**
   * Conversion event'i kaydet
   */
  async trackConversionEvent(
    qrId: string,
    scanLogId: number | null,
    eventType: string,
    eventValue?: number,
    eventData?: Record<string, any>
  ) {
    try {
      const sb = getSupabase();
      await sb.from("conversion_events").insert({
        qr_id: qrId,
        scan_log_id: scanLogId,
        event_type: eventType,
        event_value: eventValue || null,
        event_data: eventData || {},
      });
      this.cache.delete(`analytics_${qrId}`);
    } catch (error) {
      console.error("Error tracking conversion:", error);
    }
  }

  /**
   * Anomaly detection (şüpheli taramalar)
   */
  async detectAnomalies(qrId: string, recentScans: any[]) {
    if (!recentScans || recentScans.length === 0) return;

    try {
      const sb = getSupabase();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentCount = recentScans.filter(
        (s) => new Date(s.scanned_at) > oneHourAgo
      ).length;

      // Burst detection
      if (recentCount > 50) {
        await sb.from("anomaly_logs").insert({
          qr_id: qrId,
          anomaly_type: "burst_scans",
          severity: recentCount > 100 ? "critical" : "high",
          details: { scans_per_hour: recentCount, threshold: 50 },
        });
      }

      // Same IP anomaly
      const ipCounts: Record<string, number> = {};
      recentScans
        .filter((s) => new Date(s.scanned_at) > oneHourAgo)
        .forEach((s) => {
          if (s.ip_hash) ipCounts[s.ip_hash] = (ipCounts[s.ip_hash] || 0) + 1;
        });

      for (const [ip, count] of Object.entries(ipCounts)) {
        if (count > 10) {
          await sb.from("anomaly_logs").insert({
            qr_id: qrId,
            anomaly_type: "same_ip",
            severity: count > 30 ? "critical" : "medium",
            details: { ip_hash: ip, scan_count: count },
          });
        }
      }
    } catch (error) {
      console.error("Error detecting anomalies:", error);
    }
  }

  /**
   * Conversion rate hesapla
   */
  async getConversionMetrics(qrId: string, days = 30) {
    try {
      const sb = getSupabase();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const { count: totalScans } = await sb
        .from("scan_logs")
        .select("*", { count: "exact" })
        .eq("qr_id", qrId)
        .gte("scanned_at", `${startDateStr}T00:00:00.000Z`);

      const { count: totalConversions } = await sb
        .from("conversion_events")
        .select("*", { count: "exact" })
        .eq("qr_id", qrId)
        .gte("tracked_at", `${startDateStr}T00:00:00.000Z`)
        .in("event_type", ["purchase", "signup", "form_submit"]);

      const scanCount = totalScans ?? 0;
      const conversionCount = totalConversions ?? 0;

      return {
        totalScans: scanCount,
        totalConversions: conversionCount,
        conversionRate:
          scanCount > 0 ? ((conversionCount / scanCount) * 100).toFixed(2) : "0.00",
      };
    } catch (error) {
      console.error("Error getting conversion metrics:", error);
      return { totalScans: 0, totalConversions: 0, conversionRate: 0 };
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsServiceClass();
