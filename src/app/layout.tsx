import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sheetapp-three.vercel.app"),
  title: {
    default: "SheetApp — Turn Your Spreadsheet Into a Real Internal App",
    template: "%s · SheetApp",
  },
  description:
    "Upload your Excel or CSV spreadsheet and turn it into a structured internal business app with dashboards, forms, search, and permissions.",
  keywords: [
    "spreadsheet to app",
    "Excel to app",
    "CSV to database",
    "internal tools",
    "SheetApp",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SheetApp",
    title: "SheetApp — Turn Your Spreadsheet Into a Real Internal App",
    description:
      "Spreadsheet → Business App. Upload Excel or CSV and get a database, dashboard, forms, and permissions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SheetApp — Turn Your Spreadsheet Into a Real Internal App",
    description:
      "Upload your Excel or CSV spreadsheet and turn it into a structured internal business app.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsent />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "14px",
            },
          }}
          />
        </body>
      </html>
  );
}
