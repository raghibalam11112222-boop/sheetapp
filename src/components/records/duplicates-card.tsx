"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, EyeOff, GitMerge, RotateCcw } from "lucide-react";
import {
  decideDuplicateAction,
  mergeDuplicateGroupAction,
  reopenDuplicateAction,
  type DuplicateDecisionInput,
} from "@/actions/duplicates";
import type { DismissedGroup, LiveDuplicateGroup } from "@/lib/data/duplicates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";

export function DuplicatesCard({
  tableId,
  groups,
  dismissed,
  canManage,
}: {
  tableId: string;
  groups: LiveDuplicateGroup[];
  dismissed: DismissedGroup[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  if (!groups.length && !dismissed.length) return null;

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(key + done);
    const result = await fn().catch((err: unknown) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : "Something went wrong.",
    }));
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }
    toast.success(done);
    router.refresh();
  }

  const merge = (group: LiveDuplicateGroup) =>
    run(group.key, () => mergeDuplicateGroupAction(tableId, group.records.map((r) => r.id)), "Records merged");

  const decide = (group: LiveDuplicateGroup, decision: DuplicateDecisionInput) =>
    run(
      group.key,
      () => decideDuplicateAction(tableId, group.key, decision),
      decision === "KEPT_SEPARATE" ? "Kept as separate records" : "Group ignored"
    );

  const reopen = (group: DismissedGroup) =>
    run(group.key, () => reopenDuplicateAction(tableId, group.key), "Group reopened");

  return (
    <Card className="border-[#F5C66B] bg-[#FFFBF0]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-[#D97706]" />
          Potential duplicates found
          <span className="ml-auto text-xs font-normal text-[#6B7280]">
            {groups.length} group{groups.length === 1 ? "" : "s"} to review
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.key}
            data-group={group.key}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5"
          >
            <p className="text-sm text-[#111111]">
              <span className="font-medium">{group.values.slice(0, 3).join(" · ")}</span>
              {group.values.length > 3 && (
                <span className="text-[#6B7280]"> +{group.values.length - 3} variants</span>
              )}
              <span className="ml-2 text-xs text-[#6B7280]">
                {group.records.length} records
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!canManage || busy !== null}
                onClick={() => merge(group)}
              >
                <GitMerge className="h-3.5 w-3.5" />
                {busy === group.key + "Records merged" ? "Merging…" : "Merge"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!canManage || busy !== null}
                onClick={() => decide(group, "KEPT_SEPARATE")}
              >
                <Check className="h-3.5 w-3.5" />
                Keep separate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!canManage || busy !== null}
                onClick={() => decide(group, "IGNORED")}
              >
                <EyeOff className="h-3.5 w-3.5" />
                Ignore
              </Button>
            </div>
          </div>
        ))}

        {dismissed.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowDismissed((v) => !v)}
              className={cn(
                "text-xs font-medium text-[#6B7280] hover:text-[#111111]"
              )}
            >
              {showDismissed ? "Hide" : "Show"} {dismissed.length} dismissed group
              {dismissed.length === 1 ? "" : "s"}
            </button>
            {showDismissed && (
              <ul className="mt-2 space-y-1.5">
                {dismissed.map((group) => (
                  <li
                    key={group.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-[#6B7280]">
                      {group.values.slice(0, 2).join(" · ")}
                      <span className="ml-2 text-[11px] uppercase tracking-wide">
                        {group.decision === "KEPT_SEPARATE" ? "kept separate" : "ignored"}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canManage || busy !== null}
                      onClick={() => reopen(group)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reopen
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
