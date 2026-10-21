import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = { title: "Changelog" };

export default function ChangelogPage() {
  return (
    <StaticPage
      title="Changelog"
      intro="What shipped, what changed, and what's coming next."
    >
      <StaticSection heading="v0.1.0 — Initial MVP">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Conversion-focused landing page.</li>
          <li>Sign up, sign in, password reset, and protected routes.</li>
          <li>Spreadsheet upload, analysis, schema review, and app generation.</li>
          <li>Generated dashboards, tables, forms, search, filters, and export.</li>
          <li>Team invitations with Admin, Manager, Member, and Viewer roles.</li>
          <li>Subscription scaffolding in mock mode — no real charges.</li>
        </ul>
      </StaticSection>
      <StaticSection heading="Planned">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Google Sheets integration.</li>
          <li>Lightweight workflow automation.</li>
          <li>Real payment processing.</li>
        </ul>
      </StaticSection>
    </StaticPage>
  );
}
