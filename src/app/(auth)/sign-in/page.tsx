import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/guards";
import { AuthCard } from "@/components/auth/auth-card";

/**
 * First-party Firebase sign-in page (replaces Clerk's hosted <SignIn/>).
 * Reuses the old catch-all path so existing links keep working: the folder
 * moved from `sign-in/[[...rest]]/` to a plain page since Clerk needed deep
 * factor routes and Firebase does not.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const sessionUid = await getSessionUid();

  // Cookie-valid visitors go straight through (the card's client-side
  // recovery handles the fb-signed-in-but-cookie-stale gap).
  const safeNext = next && next.startsWith("/") ? next : "/dashboard";
  if (sessionUid) redirect(safeNext);

  return <AuthCard mode="sign-in" />;
}
