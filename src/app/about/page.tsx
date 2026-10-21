import Link from "next/link";
import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <StaticPage
      title="About SheetApp"
      intro="Small businesses run on spreadsheets. We're turning those spreadsheets into software."
    >
      <StaticSection heading="What we believe">
        <p>
          The spreadsheet your business depends on already contains your business logic —
          your customers, orders, inventory, and processes. You shouldn&apos;t have to
          rebuild all of that from scratch to get a real internal app.
        </p>
      </StaticSection>
      <StaticSection heading="How we work">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Spreadsheet → Business App. Nothing generic, nothing bloated.</li>
          <li>You review everything before anything is created.</li>
          <li>Your data stays yours — export anytime, leave anytime.</li>
        </ul>
        <p>
          <Link href="/sign-up" className="font-medium text-[#111318] underline underline-offset-4">
            Turn your spreadsheet into an app
          </Link>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
