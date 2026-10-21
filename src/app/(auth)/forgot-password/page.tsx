import Link from "next/link";

/** Password reset is now handled by Clerk's SignIn ("Forgot password?" link). */
export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-[#111111]">Reset via sign-in</h1>
      <p className="text-sm text-[#6B7280]">
        Password reset moved to Clerk — use the “Forgot password?” link on the sign-in page.
      </p>
      <Link href="/sign-in" className="inline-block text-sm font-medium text-[#111111] hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
