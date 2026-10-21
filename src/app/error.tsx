"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary (app.txt §31): users never see raw stack
 * traces — just a clear message and a way forward. Technical details go to
 * the server log via the framework and errorLog.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-[#111111]">
        We couldn&apos;t load this page. Please try again.
      </h1>
      <p className="mt-1 max-w-md text-sm text-[#6B7280]">
        If the problem keeps happening, go back to your dashboard or sign in again.
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
