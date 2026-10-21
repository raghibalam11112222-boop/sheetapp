import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-4">
        <Skeleton className="h-8 w-36" />
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
