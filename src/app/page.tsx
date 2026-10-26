import { getSessionUid } from "@/lib/auth/guards";
import { getEarlyAccessStatus } from "@/lib/early-access";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Reveal } from "@/components/landing/reveal";
import { TrustStrip } from "@/components/landing/trust-strip";
import { Problem } from "@/components/landing/problem";
import { Transformation } from "@/components/landing/transformation";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { UseCaseSwitcher } from "@/components/landing/use-case-switcher";
import { Intelligence } from "@/components/landing/intelligence";
import { HealthAudit } from "@/components/landing/health-audit";
import { Showcase } from "@/components/landing/showcase";
import { Features } from "@/components/landing/features";
import { Security } from "@/components/landing/security";
import { ExportSection } from "@/components/landing/export-section";
import { Pricing } from "@/components/landing/pricing";
import { Demo } from "@/components/landing/demo";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Mascot } from "@/components/landing/mascot";
import { Footer } from "@/components/landing/footer";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Cheap auth probe: Firebase ID token read + local verify only — no
  // network auth service call and no DB work on the marketing page's
  // every hit.
  const sessionUid = await getSessionUid();
  const isAuthenticated = Boolean(sessionUid);
  // Preserved flow: protected onboarding requires auth; proxy redirects
  // unauthenticated users to /sign-in?next=/onboarding/upload.
  const startHref = isAuthenticated ? "/dashboard" : "/onboarding/upload";
  const signInHref = isAuthenticated ? "/dashboard" : "/sign-in";
  const earlyAccess = await getEarlyAccessStatus();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SheetApp",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Upload your Excel or CSV spreadsheet and turn it into a structured internal business app with dashboards, forms, search, and permissions.",
    offers: [
      { "@type": "Offer", name: "Early Access", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Starter", price: "9", priceCurrency: "USD" },
      { "@type": "Offer", name: "Business", price: "19", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro", price: "39", priceCurrency: "USD" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#111318]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar isAuthenticated={isAuthenticated} startHref={startHref} signInHref={signInHref} />

      <main id="main">
        <Hero startHref={startHref} />
        <Reveal>
          <TrustStrip />
        </Reveal>
        <Reveal>
          <Problem />
        </Reveal>
        <Reveal>
          <Transformation />
        </Reveal>
        <Reveal>
          <HowItWorks startHref={startHref} />
        </Reveal>
        <Reveal>
          <Intelligence />
        </Reveal>
        <Reveal>
          <HealthAudit startHref={startHref} />
        </Reveal>
        <Reveal>
          <Showcase />
        </Reveal>
        <Reveal>
          <Features />
        </Reveal>
        <Reveal>
          <UseCases />
        </Reveal>
        <Reveal>
          <UseCaseSwitcher />
        </Reveal>
        <Reveal>
          <Demo startHref={startHref} />
        </Reveal>
        <Reveal>
          <Security />
        </Reveal>
        <Reveal>
          <ExportSection />
        </Reveal>
        <Reveal>
          <Pricing isAuthenticated={isAuthenticated} earlyAccess={earlyAccess} />
        </Reveal>
        <Reveal>
          <Faq />
        </Reveal>
        <Reveal>
          <FinalCta startHref={startHref} />
        </Reveal>
      </main>

      <Footer isAuthenticated={isAuthenticated} />
      <Mascot />
    </div>
  );
}
