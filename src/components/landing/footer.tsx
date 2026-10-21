import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Security", href: "/#security" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
      { label: "Refunds", href: "/refunds" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Help", href: "/help" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
      { label: "Refunds", href: "/refunds" },
    ],
  },
];

export function Footer({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="border-t border-[rgba(0,0,0,0.08)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo href="/" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#667085]">
            Turn business spreadsheets into real internal apps.
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/sign-in"}
            className="mt-3 inline-flex min-h-[32px] items-center text-sm font-medium text-[#111318] hover:underline"
          >
            {isAuthenticated ? "Go to Dashboard" : "Sign in"}
          </Link>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
              {col.heading}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[32px] items-center rounded-sm text-[#667085] transition-colors hover:text-[#111318]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-[rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-[13px] text-[#667085] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} SheetApp. All rights reserved.</span>
          <span>Billing in mock mode</span>
        </div>
      </div>
    </footer>
  );
}
