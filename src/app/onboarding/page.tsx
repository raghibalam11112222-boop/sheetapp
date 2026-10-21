import { requireOrg } from "@/lib/auth/guards";
import { UseCaseStep } from "./use-case-step";

export const metadata = {
  title: "Get started",
  description: "Tell us what your spreadsheet is for, then upload it.",
};

export default async function OnboardingPage() {
  await requireOrg();
  return <UseCaseStep />;
}
