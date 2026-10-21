import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <StaticPage
      title="Contact"
      intro="Questions, feedback, or something broken? We read every message."
    >
      <StaticSection heading="Email us">
        <p>
          <a
            href="mailto:hello@sheetapp.com"
            className="font-medium text-[#111318] underline underline-offset-4"
          >
            hello@sheetapp.com
          </a>
        </p>
        <p>
          Include what you were doing, the file type you uploaded if relevant, and any
          error message you saw — screenshots help.
        </p>
      </StaticSection>
    </StaticPage>
  );
}
