import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = {
  title: "Terms of Service · SheetApp",
  description: "The rules for using SheetApp.",
};

export default function TermsPage() {
  return (
    <StaticPage
      title="Terms of Service"
      intro="The short, plain version of the rules for using SheetApp."
    >
      <StaticSection heading="What SheetApp does">
        SheetApp turns spreadsheets you upload into internal business apps with
        dashboards, tables, forms, and team permissions. You keep ownership of
        your data at all times.
      </StaticSection>
      <StaticSection heading="Your account">
        You must be at least 13 years old to use SheetApp, or have a parent or
        guardian manage your account. You are responsible for keeping your
        password secret and for everything done under your account. One account
        per person — do not share logins.
      </StaticSection>
      <StaticSection heading="Acceptable use">
        Do not upload files you have no right to use, and do not use SheetApp
        to break the law, harm others, probe other workspaces, or overload the
        service. We may suspend accounts that do.
      </StaticSection>
      <StaticSection heading="Early access and billing">
        SheetApp is currently in free early access: there is no charge and no
        card is required. Paid weekly plans will be introduced after the first
        1,000 users. Billing runs in mock mode until then — plan changes in the
        app apply immediately with no charges. See the Refund Policy for what
        happens if you are ever charged by mistake.
      </StaticSection>
      <StaticSection heading="Your data and deletion">
        You can export your data to CSV or Excel at any time, and you can
        delete your account and all of its data from Settings. Deletion is
        permanent. See the Privacy Policy for details on what we store.
      </StaticSection>
      <StaticSection heading="Availability">
        SheetApp is provided as-is during early access. We work to keep it
        running but cannot guarantee uninterrupted service, and we are not
        liable for decisions made from your data.
      </StaticSection>
      <StaticSection heading="Changes">
        If these terms change in a way that matters, we will note it here and,
        for material changes, notify account holders before they take effect.
      </StaticSection>
    </StaticPage>
  );
}
