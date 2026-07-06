"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    // Log to server for PM2 visibility
    fetch("/api/v1/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error?.message, digest: error?.digest, stack: error?.stack?.slice(0, 500) }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ maxWidth: 480, padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Bir hata oluştu</h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            {error?.message || "Beklenmeyen bir hata meydana geldi."}
          </p>
          {error?.digest && (
            <p style={{ color: "#475569", fontSize: "0.75rem", marginBottom: "1rem", fontFamily: "monospace" }}>
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: "8px", padding: "0.6rem 1.5rem", cursor: "pointer", fontSize: "1rem" }}
          >
            Tekrar Dene
          </button>
          <br /><br />
          <a
            href="/status"
            style={{ display: "inline-block", background: "#111827", color: "#fff", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "8px", padding: "0.6rem 1.5rem", textDecoration: "none", fontSize: "0.95rem", fontWeight: 700 }}
          >
            Go to status page
          </a>
          <br /><br />
          <a href="/dashboard" style={{ color: "#7c3aed", fontSize: "0.85rem" }}>Dashboard&apos;a Dön</a>
        </div>
      </body>
    </html>
  );
}
