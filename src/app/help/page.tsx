import Link from "next/link";
import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = { title: "Help" };

export default function HelpPage() {
  return (
    <StaticPage
      title="Help"
      intro="Quick answers to the most common questions about using SheetApp."
    >
      <StaticSection heading="I can't sign in">
        <p>
          Double-check your email address, then use the{" "}
          <Link href="/forgot-password" className="font-medium text-[#111318] underline underline-offset-4">
            password reset page
          </Link>{" "}
          to set a new password.
        </p>
      </StaticSection>
      <StaticSection heading="My upload fails">
        <p>
          Make sure the file is an .xlsx, .xls, or .csv within the size limit, with headers
          in the first row. Very large or password-protected files may fail — try exporting
          a smaller CSV and uploading that instead.
        </p>
      </StaticSection>
      <StaticSection heading="The detected schema looks wrong">
        <p>
          That&apos;s what the review screen is for. Rename fields, change types, and adjust
          relationships before generating — and you can keep editing everything after your
          app is created.
        </p>
      </StaticSection>
      <StaticSection heading="Billing questions">
        <p>
          Billing is in mock mode during the MVP: no cards, no charges. Plans and limits
          shown on the pricing section describe direction, not enforced quotas.
        </p>
      </StaticSection>
      <StaticSection heading="Still stuck?">
        <p>
          <Link href="/contact" className="font-medium text-[#111318] underline underline-offset-4">
            Contact us
          </Link>{" "}
          and describe what you were doing when the problem happened.
        </p>
      </StaticSection>
    </StaticPage>
  );
}
