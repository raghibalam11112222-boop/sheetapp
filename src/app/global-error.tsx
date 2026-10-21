"use client";

import Link from "next/link";

/**
 * Last-resort boundary for layout failures (app.txt §31). Must render its
 * own <html>/<body> because the root layout itself failed.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111111" }}>
            We couldn&apos;t load the app. Please try again.
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>
            If the problem keeps happening, sign in again.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                border: "none",
                background: "#111111",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link href="/" style={{ fontSize: 14, color: "#111111", alignSelf: "center" }}>
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
