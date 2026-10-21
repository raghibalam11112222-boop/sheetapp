import Link from "next/link";
import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = { title: "Documentation" };

export default function DocsPage() {
  return (
    <StaticPage
      title="Documentation"
      intro="Everything you need to go from a spreadsheet to a working internal app."
    >
      <StaticSection heading="1. Upload your spreadsheet">
        <p>
          Drop in an Excel (.xlsx, .xls) or CSV file. Files are validated server-side —
          macros and formulas are never executed as code — and you&apos;ll see the sheets,
          columns, and row counts we found.
        </p>
      </StaticSection>
      <StaticSection heading="2. Review what was detected">
        <p>
          SheetApp identifies tables, field types, relationships, duplicates, and missing
          values, then shows you the proposed schema. Rename fields, change types, and
          confirm relationships before anything is created.
        </p>
      </StaticSection>
      <StaticSection heading="3. Generate your app">
        <p>
          One click builds your dashboard, data tables, forms, search, filters, and roles.
          Your records are imported into your workspace database with validation and
          duplicate handling.
        </p>
      </StaticSection>
      <StaticSection heading="4. Work with your data">
        <p>
          Create, edit, delete, search, filter, and export records at any time. Invite
          teammates with Admin, Manager, Member, or Viewer roles.
        </p>
        <p>
          <Link href="/sign-up" className="font-medium text-[#111318] underline underline-offset-4">
            Create your account to start
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
