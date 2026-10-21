import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "xlsx",
    "pg",
    "embedded-postgres",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "1200mb",
    },
    // Server-action POSTs hit the page URL, which passes through proxy.ts.
    // Without this, the proxy clips bodies at 10MB and multipart parsing
    // fails with "Unexpected end of form" on large uploads.
    proxyClientMaxBodySize: "1200mb",
  },
  // Baseline hardening headers (app.txt §25). CSP is REPORT-ONLY: violations
  // log to the browser console but never block; promote to enforce (and drop
  // directives we prove we don't need) only after a clean shakedown window.
  // No HSTS here: it would force HTTPS on localhost dev. Production gets HSTS
  // from the Vercel edge (max-age=63072000; includeSubDomains; preload —
  // verified 2026-10-21).
  async headers() {
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
      "style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Clerk FAPI (+ its websockets), Vercel Blob direct uploads, same-origin APIs.
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.accounts.dev wss://*.clerk.com https://*.blob.vercel-storage.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
