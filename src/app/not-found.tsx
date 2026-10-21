import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <p className="text-5xl font-semibold tracking-tight text-[#111111]">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#111111]">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          This page moved, never existed, or you followed a bad link.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-4 text-sm font-medium text-white hover:bg-[#333333]"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#E5E7EB] px-4 text-sm font-medium text-[#111111] hover:bg-[#F8F9FA]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
