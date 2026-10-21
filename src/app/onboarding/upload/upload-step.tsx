"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, ArrowLeft, PlayCircle } from "lucide-react";
import { uploadSpreadsheetAction, finalizeSpreadsheetUploadAction } from "@/actions/upload";
import { createDemoWorkspaceAction } from "@/actions/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { Logo } from "@/components/logo";

const ACCEPT = ".xlsx,.xls,.csv";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function prettyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/413|payload|too large|body size|request entity/i.test(msg)) {
    return "That upload was rejected as too large — please try again or use a smaller file.";
  }
  if (/network|fetch|ECONN|abort|failed to/i.test(msg)) {
    return "Upload failed — check your connection and try again.";
  }
  return "Upload failed — please try again.";
}

export function UploadStep({
  useCase,
  orgId,
  uploadMode,
}: {
  useCase: string;
  orgId: string;
  uploadMode: "blob" | "local";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetInfo, setSheetInfo] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"upload" | "analyze">("upload");
  const [demoLoading, setDemoLoading] = useState(false);

  /** Reads just the workbook directory (no cell data) to show the sheet count. */
  async function inspectFile(next: File) {
    setFile(next);
    setSheetInfo(null);
    const ext = next.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      setSheetInfo("1 sheet");
      return;
    }
    try {
      const { read } = await import("xlsx");
      const wb = read(await next.arrayBuffer(), { type: "array", bookSheets: true });
      const n = wb.SheetNames.length;
      setSheetInfo(n === 1 ? "1 sheet" : `${n} sheets`);
    } catch {
      setSheetInfo(null);
    }
  }

  async function onUpload() {
    if (!file) {
      toast.error("Choose a spreadsheet first");
      return;
    }
    if (file.size > 1000 * 1024 * 1024) {
      toast.error("That file is over 1000 MB");
      return;
    }
    // The in-process path sends the file through the serverless function,
    // which Vercel caps at 4.5 MB — fail fast with a clear message instead
    // of letting the platform reject it. Production uses "blob" mode anyway.
    if (uploadMode === "local" && file.size > 4 * 1024 * 1024) {
      toast.error("Direct large-file storage isn't configured here — files over 4 MB can't be uploaded in this mode.");
      return;
    }

    setLoading(true);
    setPhase("upload");
    try {
      let dataSourceId: string;

      if (uploadMode === "blob") {
        // Direct-to-Blob: bytes go browser → Vercel Blob (no serverless body
        // limit), then the finalize action validates + analyzes server-side.
        const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
        const type =
          file.type ||
          (ext === "csv"
            ? "text/csv"
            : ext === "xls"
              ? "application/vnd.ms-excel"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        const payload: Blob = file.type ? file : new Blob([file], { type });
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(`${orgId}/${crypto.randomUUID()}.${ext}`, payload, {
          access: "private",
          handleUploadUrl: "/api/blob",
        });

        setPhase("analyze");
        const result = await finalizeSpreadsheetUploadAction({
          blobUrl: blob.url,
          fileName: file.name,
          hint: hint || useCase,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        dataSourceId = result.data.dataSourceId;
      } else {
        setPhase("analyze");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("hint", hint || useCase);
        const result = await uploadSpreadsheetAction(fd);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        dataSourceId = result.data.dataSourceId;
      }

      router.push(`/onboarding/review/${dataSourceId}`);
    } catch (err) {
      // Network failures, 413s, function timeouts — anything that rejects
      // the promise must surface an error, never a stuck spinner.
      console.error("upload failed", err);
      toast.error(prettyUploadError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onDemo() {
    setDemoLoading(true);
    const result = await createDemoWorkspaceAction();
    setDemoLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Demo workspace created");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <Logo href="/dashboard" />
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">
              Step 2 of 3
            </p>
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111111]"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
            Upload your spreadsheet
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            XLSX, XLS or CSV up to 1000 MB. We&apos;ll analyze it and suggest a schema.
          </p>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) void inspectFile(dropped);
              }}
            className={cn(
              "mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors",
              dragging
                ? "border-[#111111] bg-[#F8F9FA]"
                : "border-[#E5E7EB] hover:border-gray-300"
            )}
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-8 w-8 text-[#16A34A]" />
                <p className="mt-2 text-sm font-medium text-[#111111]">{file.name}</p>
                <p className="text-xs text-[#6B7280]">
                  {formatSize(file.size)}
                  {sheetInfo ? ` · ${sheetInfo}` : " · counting sheets…"} — click to replace
                </p>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-[#6B7280]" />
                <p className="mt-2 text-sm font-medium text-[#111111]">
                  Drop your file here, or click to browse
                </p>
                <p className="text-xs text-[#6B7280]">Customers, orders, inventory — anything</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                if (picked) void inspectFile(picked);
              }}
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="hint">What&apos;s inside? (optional)</Label>
            <Input
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. customer list with orders and payments"
              maxLength={120}
            />
          </div>

          <Button className="mt-5 w-full" onClick={onUpload} loading={loading || demoLoading} disabled={!file}>
            {loading ? "Uploading & analyzing…" : "Analyze spreadsheet"}
          </Button>
          {loading && (
            <p className="mt-2 text-center text-xs text-[#6B7280]">
              {phase === "upload"
                ? "Uploading directly to secure storage…"
                : "Reading sheets, inferring types and checking data quality…"}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E5E7EB]" />
            <span className="text-xs text-[#6B7280]">or</span>
            <div className="h-px flex-1 bg-[#E5E7EB]" />
          </div>

          <button
            type="button"
            onClick={onDemo}
            disabled={demoLoading || loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#111111] hover:bg-[#F8F9FA] disabled:opacity-60"
          >
            <PlayCircle className="h-4 w-4" />
            Explore with a demo workspace
          </button>

          <button
            type="button"
            disabled
            title="Coming soon"
            className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-[#E5E7EB] px-4 py-2.5 text-sm text-[#6B7280]"
          >
            Connect Google Sheets
            <span className="rounded-full bg-[#F8F9FA] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
              Coming soon
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
