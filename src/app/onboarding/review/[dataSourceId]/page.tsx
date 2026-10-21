import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth/guards";
import { getSchemaReviewState } from "@/actions/schema";
import { SchemaReview } from "./schema-review";

export const metadata = {
  title: "Review schema",
  description: "Review detected tables and fields before generating your app.",
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ dataSourceId: string }>;
}) {
  await requireOrg();
  const { dataSourceId } = await params;
  const state = await getSchemaReviewState(dataSourceId);
  if (!state) redirect("/onboarding/upload");

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <SchemaReview state={state} />
      </div>
    </div>
  );
}
