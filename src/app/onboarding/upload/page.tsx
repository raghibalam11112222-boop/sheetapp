import { requireOrg } from "@/lib/auth/guards";
import { storageBackend } from "@/lib/storage";
import { UploadStep } from "./upload-step";

export const metadata = {
  title: "Upload spreadsheet",
  description: "Upload an Excel or CSV file to generate your app.",
};

// Large workbooks (1000 MB / 16+ sheets allowed by the product) need headroom
// for the authenticated blob download + parse + analysis on finalize.
export const maxDuration = 60;

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ useCase?: string }>;
}) {
  const ctx = await requireOrg();
  const { useCase } = await searchParams;
  return (
    <UploadStep useCase={useCase ?? "custom"} orgId={ctx.orgId} uploadMode={storageBackend()} />
  );
}
