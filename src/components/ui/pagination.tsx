"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pages = React.useMemo(() => buildPages(page, pageCount), [page, pageCount]);

  return (
    <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
      <p className="text-[13px] text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{Math.max(pageCount, 1)}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1.5 text-muted-foreground">
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "secondary" : "ghost"}
              size="iconSm"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={p === page ? "font-semibold" : undefined}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function buildPages(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < pageCount - 1) pages.push("…");
  pages.push(pageCount);
  return pages;
}
