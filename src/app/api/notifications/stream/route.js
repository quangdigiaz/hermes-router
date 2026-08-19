import { getRecentNotifications, getNotificationEmitter } from "@/lib/notificationBus";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const encoder = new TextEncoder();
  const emitter = getNotificationEmitter();
  const state = { closed: false, send: null, keepalive: null };

  const cleanup = () => {
    if (state.closed) return;
    state.closed = true;
    if (state.send) emitter.off("notification", state.send);
    if (state.keepalive) clearInterval(state.keepalive);
  };

  request.signal.addEventListener("abort", cleanup, { once: true });

  const stream = new ReadableStream({
    start(controller) {
      // Send buffered notifications on connect
      const buffered = getRecentNotifications();
      if (buffered.length > 0) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", notifications: buffered })}\n\n`));
      }

      state.send = (notification) => {
        if (state.closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "notification", notification })}\n\n`));
        } catch {
          cleanup();
        }
      };

      emitter.on("notification", state.send);

      // Keepalive ping every 25s
      state.keepalive = setInterval(() => {
        if (state.closed) { clearInterval(state.keepalive); return; }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 25000);
    },

    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
