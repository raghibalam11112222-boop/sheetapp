import Link from "next/link";
import { Check } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { EarlyAccessCounter } from "./early-access-counter";
import type { EarlyAccessStatus } from "@/lib/early-access";

const EARLY_ACCESS_FEATURES = [
  "Spreadsheet imports",
  "AI-powered app generation",
  "Generated dashboards",
  "Forms and CRUD",
  "Search and filters",
  "Basic permissions",
];

const WEEKLY_PLANS = [
  {
    plan: "Starter",
    price: 9,
    tagline: "For small teams.",
    cta: "Start Starter",
    features: [
      "Spreadsheet imports",
      "Generated apps",
      "Core CRUD",
      "Search & filters",
      "Basic permissions",
    ],
    popular: false,
  },
  {
    plan: "Business",
    price: 19,
    tagline: "For growing teams.",
    cta: "Start Business",
    features: [
      "Everything in Starter",
      "More team members",
      "Advanced permissions",
      "Workflows",
      "Priority support",
    ],
    popular: true,
  },
  {
    plan: "Pro",
    price: 39,
    tagline: "For larger operations.",
    cta: "Start Pro",
    features: [
      "Everything in Business",
      "Larger datasets",
      "Advanced workflows",
      "Advanced controls",
      "Priority support",
    ],
    popular: false,
  },
];

export function Pricing({
  isAuthenticated,
  earlyAccess,
}: {
  isAuthenticated: boolean;
  earlyAccess: EarlyAccessStatus;
}) {
  const claimHref = isAuthenticated ? "/dashboard" : "/sign-up";
  const planHref = isAuthenticated ? "/billing" : "/sign-up";

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-32 border-b border-[rgba(0,0,0,0.08)] bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="pricing-heading"
          eyebrow="Pricing"
          title="Free for the first 1,000 users."
          sub="Build your internal app during early access. Once we reach 1,000 users, SheetApp will move to simple weekly pricing."
        />

        {/* Early access — live remaining-spots counter */}
        <div className="relative mx-auto mt-10 max-w-3xl rounded-2xl border-2 border-[#111318] bg-white p-6 shadow-[0_12px_32px_-8px_rgb(16_24_40/0.16)] sm:p-8">
          <span className="absolute -top-3 left-6 rounded-full bg-[#111318] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            {earlyAccess.exhausted ? "Early Access Ended" : "Early Access"}
          </span>
          <div className="grid gap-6 sm:grid-cols-[1fr_1.2fr] sm:items-center">
            <div>
              <p className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight text-[#111318]">$0</span>
                <span className="text-sm font-medium text-[#667085]">free for early users</span>
              </p>
              {earlyAccess.exhausted ? (
                <p className="mt-4 text-xl font-semibold tracking-[-0.01em] text-[#111318]">
                  Early access has ended
                </p>
              ) : (
                <div className="mt-4">
                  <EarlyAccessCounter remaining={earlyAccess.remaining} />
                  <p className="mt-1.5 text-[13px] font-medium text-[#667085]">
                    free spots remaining
                  </p>
                </div>
              )}
              <p className="mt-3 text-sm leading-relaxed text-[#667085]">
                Join during early access before paid weekly plans begin.
              </p>
              {earlyAccess.exhausted ? (
                <Link
                  href="#weekly-plans"
                  className="mt-5 inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-xl bg-[#111318] px-6 text-sm font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#23272F] hover:shadow-[0_4px_12px_-2px_rgb(16_24_40/0.25)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318] sm:w-auto"
                >
                  View Plans
                </Link>
              ) : (
                <>
                  <Link
                    href={claimHref}
                    className="mt-5 inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-xl bg-[#111318] px-6 text-sm font-medium text-white shadow-[0_1px_2px_rgb(16_24_40/0.16)] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#23272F] hover:shadow-[0_4px_12px_-2px_rgb(16_24_40/0.25)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318] sm:w-auto"
                  >
                    Claim Free Access
                  </Link>
                  <p className="mt-2.5 text-[12px] font-medium text-[#667085]">
                    Available until 1,000 users
                  </p>
                </>
              )}
            </div>
            <ul className="space-y-2 text-sm text-[#667085]">
              {EARLY_ACCESS_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Future weekly plans */}
        <p
          id="weekly-plans"
          className="mt-10 scroll-mt-32 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[#667085]"
        >
          After 1,000 users
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {WEEKLY_PLANS.map((tier, i) => (
            <Reveal key={tier.plan} delay={100 + i * 100} className="h-full">
              <div
                className={
                  tier.popular
                    ? "flex h-full flex-col rounded-2xl border-2 border-[#111318] bg-white p-6 shadow-[0_8px_24px_-8px_rgb(16_24_40/0.12)] transition-[transform,box-shadow] duration-200 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-1 hover:shadow-[0_16px_40px_-8px_rgb(16_24_40/0.2)]"
                    : "flex h-full flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-1 hover:border-[rgba(0,0,0,0.16)] hover:shadow-[0_12px_32px_-8px_rgb(16_24_40/0.16)]"
                }
              >
                {tier.popular ? (
                  <span className="mb-3 inline-flex w-fit items-center rounded-full bg-[#111318] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Most Popular
                  </span>
                ) : null}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#111318]">
                  {tier.plan}
                </h3>
                <p className="mt-1 text-[13px] text-[#667085]">{tier.tagline}</p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-[#111318]">
                    ${tier.price}
                  </span>
                  <span className="text-sm font-medium text-[#667085]">/ week</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-[#667085]">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={planHref}
                  className={
                    tier.popular
                      ? "mt-6 inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-xl bg-[#111318] text-sm font-medium text-white transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#23272F] hover:shadow-[0_4px_12px_-2px_rgb(16_24_40/0.25)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
                      : "mt-6 inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-sm font-medium text-[#111318] transition-[background-color,opacity,transform,box-shadow] duration-150 hover:-translate-y-px hover:bg-[#F8F9FB] hover:shadow-[0_4px_12px_-4px_rgb(16_24_40/0.2)] active:translate-y-0 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-[#667085]">
          Join during early access and start for free. Paid weekly plans will be introduced
          once SheetApp reaches 1,000 users — early users start free and won&apos;t be
          asked to pay during the early-access period.
        </p>
        <p className="mt-3 text-center text-[13px] text-[#667085]">
          Billing is in mock mode during early access — no card required.
        </p>
      </div>
    </section>
  );
}
