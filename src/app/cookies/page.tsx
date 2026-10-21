import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = {
  title: "Cookie Policy · SheetApp",
  description: "Which cookies SheetApp uses and why.",
};

export default function CookiesPage() {
  return (
    <StaticPage
      title="Cookie Policy"
      intro="Every cookie we set, what it does, and how long it lasts."
    >
      <StaticSection heading="Strictly-necessary cookies (always on)">
        These make sign-in and the app work. The app cannot function without
        them, so they apply even if you decline optional cookies: a session
        cookie that keeps you signed in (14 days), and a workspace cookie that
        remembers your active workspace (1 year). Both are HttpOnly and
        SameSite=Lax, and Secure over HTTPS.
      </StaticSection>
      <StaticSection heading="Preference cookies">
        Your cookie-banner choice itself is stored for 1 year so we do not ask
        again on every visit. No advertising, analytics, or cross-site tracking
        cookies are used.
      </StaticSection>
      <StaticSection heading="Managing cookies">
        Change your mind any time: clear cookies for this site in your browser
        settings and the banner will ask again on your next visit. Signing out
        ends your session immediately on all devices from Settings → Security.
      </StaticSection>
      <StaticSection heading="What we do not collect">
        We do not run third-party trackers, fingerprinting scripts, or
        advertising pixels. Product usage counts are computed from our own
        database, not from browser tracking.
      </StaticSection>
    </StaticPage>
  );
}
