import Link from "next/link";

/**
 * Firebase delivers password resets as a direct-link flow that opens the
 * user to Firebase's hosted widget and returns to /sign-in?reset=1 — there
 * is no separate in-app reset page to render. This route stays around so
 * old bookmarks don't 404.
 */
export default function ResetPasswordPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-[#111111]">
        Check your email
      </h1>
      <p className="text-sm text-[#6B7280]">
        Password resets arrive by email — request a link from the{" "}
        <Link href="/forgot-password" className="font-medium text-[#111111] hover:underline">
          forgot password
        </Link>{" "}
        page.
      </p>
      <p>
      <Link href="/sign-in" className="inline-block text-sm font-medium text-[#111111] hover:underline">
        Back to sign in
      </Link>
      </p>
    </div>
  );
}
