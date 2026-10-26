import { SessionSync } from "@/components/auth/session-sync";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Account",
  description: "Sign in or create your SheetApp account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // SessionSync handles the recovery case where Firebase is signed in but
  // the httpOnly cookie expired — it re-seals the cookie so the sign-in
  // card's relay effect can forward the visitor onward seamlessly.
  return (
    <>
      <SessionSync />
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-8">
          <Logo href="/" />
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
        <p className="mt-6 text-center text-xs text-[#6B7280]">
          Spreadsheets in, business apps out.
        </p>
      </div>
    </>
  );
}
