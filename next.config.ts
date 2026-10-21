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
  // Baseline hardening headers (app.txt §25). No custom CSP: Next.js relies
  // on inline scripts/styles that a strict policy would break.
  // No HSTS: it would force HTTPS on localhost dev. Terminate TLS at the
  // reverse proxy in production and enable HSTS there.
  async headers() {
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
        ],
      },
    ];
  },
};

export default nextConfig;
