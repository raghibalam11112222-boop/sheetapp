import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/guards";
import { AuthCard } from "@/components/auth/auth-card";

/**
 * First-party Firebase sign-up page (replaces Clerk's hosted <SignUp/>).
 * New accounts land on /onboarding, mirroring Clerk's fallbackRedirectUrl.
 */
export default async function SignUpPage() {
  const sessionUid = await getSessionUid();
  if (sessionUid) redirect("/dashboard");

  return <AuthCard mode="sign-up" />;
}
