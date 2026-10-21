import { ClerkProvider } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Account",
  description: "Sign in or create your SheetApp account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // No card chrome here: Clerk's SignIn/SignUp render their own cards.
  // Plain pages (password reset notes) center themselves in this column.
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo href="/" />
      </div>
      <div className="w-full max-w-[400px]">{children}</div>
      <p className="mt-6 text-center text-xs text-[#6B7280]">
        Spreadsheets in, business apps out.
      </p>
      </div>
    </ClerkProvider>
  );
}
