import { StaticPage, StaticSection } from "@/components/static-page";

export const metadata = {
  title: "Refund Policy · SheetApp",
  description: "How refunds work at SheetApp.",
};

export default function RefundsPage() {
  return (
    <StaticPage
      title="Refund Policy"
      intro="Simple: if we ever charge you by mistake, you get it back."
    >
      <StaticSection heading="No charges during early access">
        SheetApp is currently free and billing runs in mock mode — plan changes
        apply immediately with no charges and no card is collected. There is
        nothing to refund while this page says early access is active.
      </StaticSection>
      <StaticSection heading="If you are ever charged">
        If a billing mistake charges you, contact us from your workspace and
        tell us the amount and date. Verified mistaken charges are refunded in
        full to the original payment method within 14 days, no questions beyond
        verifying the charge.
      </StaticSection>
      <StaticSection heading="Paid plans">
        When paid weekly plans launch after the first 1,000 users, this policy
        will be updated before the first charge with the cancellation window
        and proration rules. We will never switch you to a paid plan silently.
      </StaticSection>
      <StaticSection heading="How to request">
        Open Settings in your workspace and ask from there so we can verify
        your account, or reply to any billing email once billing emails exist.
      </StaticSection>
    </StaticPage>
  );
}
