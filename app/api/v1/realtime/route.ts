import { type NextRequest } from "next/server";
import { authRequest, sbAdmin } from "@/lib/server/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RealtimeEntity = "feedback" | "booking" | "message";

export async function GET(req: NextRequest) {
  const auth = await authRequest(req);
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  const sb = sbAdmin();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let channel: ReturnType<typeof sb.channel> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (entity: RealtimeEntity, payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        if (closed) return;
        const row = payload.new ?? payload.old ?? {};
        const id = typeof row.id === "string" ? row.id : crypto.randomUUID();
        controller.enqueue(encoder.encode(`id: ${entity}:${id}:${payload.eventType}\nevent: dashboard-change\ndata: ${JSON.stringify({ entity, eventType: payload.eventType, id })}\n\n`));
      };

      channel = sb
        .channel(`dashboard:${auth.userId}:${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "feedback_submissions", filter: `user_id=eq.${auth.userId}` }, payload => send("feedback", payload))
        .on("postgres_changes", { event: "*", schema: "public", table: "booking_submissions", filter: `user_id=eq.${auth.userId}` }, payload => send("booking", payload))
        .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages", filter: `to_user_id=eq.${auth.userId}` }, payload => send("message", payload))
        .subscribe(status => {
          if (status === "SUBSCRIBED" && !closed) controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));
        });

      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 20_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (channel) void sb.removeChannel(channel);
        try { controller.close(); } catch { /* stream already closed */ }
      };

      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (channel) void sb.removeChannel(channel);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
