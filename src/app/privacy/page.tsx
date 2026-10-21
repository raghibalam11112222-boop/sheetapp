import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = {
  title: "Privacy · SheetApp",
  description: "How SheetApp handles your data and cookies.",
};

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy"
      intro="What we store, why, and what we never do with your data."
    >
      <StaticSection heading="Cookies">
        We use two kinds of cookies, both first-party: strictly-necessary ones
        (keeping you signed in, remembering your workspace) and a record of
        your cookie choice itself. We do not use advertising cookies and we do
        not track you across other sites.
      </StaticSection>
      <StaticSection heading="Your spreadsheets">
        Files you upload are stored so your generated apps can read them. Only
        you and people you invite to your workspace can access them. Filenames
        are never used for analytics.
      </StaticSection>
      <StaticSection heading="Accounts">
        Your password is stored only as a one-way scrypt hash — we cannot read
        it. You can revoke any signed-in session at any time from Settings →
        Security.
      </StaticSection>
      <StaticSection heading="AI features">
        When enabled, only compact spreadsheet metadata (column names, types,
        sample values) is sent to the AI provider to suggest table labels —
        never your full data. Without an AI key, everything runs locally.
      </StaticSection>
      <StaticSection heading="Contact">
        Questions about your data? Ask from your workspace and we will respond.
      </StaticSection>
    </StaticPage>
  );
}
