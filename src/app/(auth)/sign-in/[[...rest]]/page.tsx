import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "../../clerk-appearance";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { userId } = await auth();
  const safeNext = next && next.startsWith("/") ? next : "/dashboard";
  if (userId) redirect(safeNext);

  return (
    <div className="space-y-4">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={safeNext}
        appearance={clerkAppearance}
      />
    </div>
  );
}
