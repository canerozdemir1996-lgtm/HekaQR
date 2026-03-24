import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Zapier/Make webhook endpoint
 * Özellikle Google Sheets, Slack, Discord, CRM'ler için
 */

// GET: Webhook kurulumu test et
export async function GET(req: NextRequest) {
  const sb = sbAdmin();
  
  return NextResponse.json({
    status: "ok",
    available_triggers: [
      "qr_created",
      "qr_updated",
      "scan_received",
      "scan_milestone", // 100, 500, 1000 tarama
      "conversion_event",
      "anomaly_detected",
    ],
    version: "1.0",
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST: Webhook events gönder
 * Kullanıcılar buraya webhook'larını konfigüre eder
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const {
      trigger,
      qr_id,
      user_id,
      webhook_url,
      include_scan_details,
      include_analytics,
    } = payload;

    if (!trigger || !qr_id || !webhook_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sb = sbAdmin();

    // Trigger'a göre data hazırla
    let eventData: any = {
      trigger,
      qr_id,
      timestamp: new Date().toISOString(),
    };

    if (include_scan_details || trigger === "scan_received") {
      // En son 10 tarama
      const { data: recentScans } = await sb
        .from("scan_logs")
        .select("device, os, country, scanned_at")
        .eq("qr_id", qr_id)
        .order("scanned_at", { ascending: false })
        .limit(10);

      eventData.recent_scans = recentScans || [];
    }

    if (include_analytics || trigger === "scan_milestone") {
      // QR analytics
      const { data: qr } = await sb
        .from("qr_codes")
        .select("scan_count, title")
        .eq("id", qr_id)
        .single();

      eventData.qr_info = qr;

      // Mileston check
      if (trigger === "scan_milestone") {
        const milestones = [100, 500, 1000, 5000, 10000];
        if (milestones.includes(qr?.scan_count)) {
          eventData.milestone_reached = qr?.scan_count;
        }
      }
    }

    // Webhook'ı çağır
    const webhookResponse = await fetch(webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });

    // Log webhook delivery
    await sb.from("webhook_logs").insert({
      qr_id,
      user_id,
      trigger,
      webhook_url,
      status_code: webhookResponse.status,
      response_time_ms: Date.now(),
    });

    return NextResponse.json({
      success: true,
      delivered: webhookResponse.ok,
      statusCode: webhookResponse.status,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Webhook subscription kaydet
 */
export async function PUT(req: NextRequest) {
  try {
    const {
      qr_id,
      user_id,
      triggers,
      webhook_url,
      active,
    } = await req.json();

    const sb = sbAdmin();

    // Webhook'ı kaydet
    const { data, error } = await sb
      .from("webhook_subscriptions")
      .upsert(
        {
          qr_id,
          user_id,
          triggers: triggers || ["scan_received"],
          webhook_url,
          active: active ?? true,
          created_at: new Date().toISOString(),
        },
        { onConflict: "qr_id,user_id" }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ subscription: data?.[0] });
  } catch (error) {
    console.error("Error saving webhook:", error);
    return NextResponse.json(
      { error: "Failed to save webhook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Webhook'u sil
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get("id");

    const sb = sbAdmin();

    const { error } = await sb
      .from("webhook_subscriptions")
      .delete()
      .eq("id", webhookId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
