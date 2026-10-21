"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Filter, Loader2, Plus, Search, Trash2, X, ChevronUp, ChevronDown } from "lucide-react";
import type { GeneratedField } from "@/generated/prisma/client";
import { deleteRecordAction } from "@/actions/records";
import type { FilterOp, RecordFilter } from "@/lib/data/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/components/ui/utils";
import { RecordCell } from "./cell";

const OPS: { id: FilterOp; label: string }[] = [
  { id: "contains", label: "contains" },
  { id: "eq", label: "is" },
  { id: "neq", label: "is not" },
  { id: "empty", label: "is empty" },
  { id: "not_empty", label: "is not empty" },
  { id: "gt", label: ">" },
  { id: "gte", label: "≥" },
  { id: "lt", label: "<" },
  { id: "lte", label: "≤" },
];

export interface DataTableProps {
  tableId: string;
  /** Singular entity label for the add button, e.g. "Customer". */
  singularLabel: string;
  fields: GeneratedField[];
  rows: { id: string; data: Record<string, unknown>; createdAt: string }[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sort?: { field: string; dir: "asc" | "desc" };
  filters: RecordFilter[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export function DataTable(props: DataTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(props.search);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState<RecordFilter[]>(props.filters);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const firstRender = useRef(true);
  const paramsKey = params.toString();
  // The previous page stays visible while Next.js fetches the next one, so
  // the table never blanks out; this flag only drives the "Updating" hint.
  const refreshing = pendingKey !== null && pendingKey !== paramsKey;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (search === props.search) return;
      push({ q: search || undefined, page: undefined });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function push(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    setPendingKey(sp.toString());
    router.replace(`/tables/${props.tableId}?${sp.toString()}`);
  }

  function applyFilters() {
    push({
      filters: draftFilters.length ? JSON.stringify(draftFilters) : undefined,
      page: undefined,
    });
    setShowFilters(false);
  }

  function toggleSort(field: GeneratedField) {
    if (!field.sortable) return;
    const active = props.sort?.field === field.name;
    if (!active) {
      push({ sort: field.name, dir: "asc", page: undefined });
    } else if (props.sort?.dir === "asc") {
      push({ sort: field.name, dir: "desc", page: undefined });
    } else {
      push({ sort: undefined, dir: undefined, page: undefined });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const result = await deleteRecordAction(deleting);
    setDeleteLoading(false);
    setDeleting(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Record deleted");
    router.refresh();
  }

  const exportHref = (format: "csv" | "xlsx") => {
    const sp = new URLSearchParams();
    if (props.search) sp.set("search", props.search);
    if (props.filters.length) sp.set("filters", JSON.stringify(props.filters));
    if (props.sort) {
      sp.set("sort", props.sort.field);
      sp.set("dir", props.sort.dir);
    }
    sp.set("format", format);
    const qs = sp.toString();
    return `/api/tables/${props.tableId}/records/export${qs ? `?${qs}` : ""}`;
  };

  const visibleFields = props.fields.slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records…"
            className="h-9 pl-8"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={() => {
            setDraftFilters(props.filters);
            setShowFilters((v) => !v);
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {props.filters.length > 0 && (
            <span className="ml-1 rounded-full bg-[#111111] px-1.5 text-[10px] text-white">
              {props.filters.length}
            </span>
          )}
        </Button>
        {props.canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-9">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={exportHref("csv")}>Download CSV</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={exportHref("xlsx")}>Download Excel</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {props.canCreate && (
          <Button asChild size="sm" className="h-9">
            <a href={`/tables/${props.tableId}/new`}>
              <Plus className="h-3.5 w-3.5" /> Add {props.singularLabel || "record"}
            </a>
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
          <div className="space-y-2">
            {draftFilters.map((filter, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={filter.field}
                  onChange={(e) => {
                    const next = [...draftFilters];
                    next[i] = { ...filter, field: e.target.value };
                    setDraftFilters(next);
                  }}
                  className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
                >
                  {props.fields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.op}
                  onChange={(e) => {
                    const next = [...draftFilters];
                    next[i] = { ...filter, op: e.target.value as FilterOp };
                    setDraftFilters(next);
                  }}
                  className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
                >
                  {OPS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {!["empty", "not_empty"].includes(filter.op) &&
                  (() => {
                    const target = props.fields.find((x) => x.name === filter.field);
                    const setValue = (value: string) => {
                      const next = [...draftFilters];
                      next[i] = { ...filter, value };
                      setDraftFilters(next);
                    };
                    const selectClass =
                      "h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm";
                    if (target?.type === "DATE" || target?.type === "DATETIME") {
                      return (
                        <Input
                          type="date"
                          value={String(filter.value ?? "")}
                          onChange={(e) => setValue(e.target.value)}
                          className="h-8 w-40 text-sm"
                          aria-label="Filter value"
                        />
                      );
                    }
                    if (target?.type === "ENUM" && (target.options?.length ?? 0) > 0) {
                      return (
                        <select
                          value={String(filter.value ?? "")}
                          onChange={(e) => setValue(e.target.value)}
                          className={selectClass}
                          aria-label="Filter value"
                        >
                          <option value="">Select…</option>
                          {(target.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      );
                    }
                    if (target?.type === "BOOLEAN") {
                      return (
                        <select
                          value={String(filter.value ?? "")}
                          onChange={(e) => setValue(e.target.value)}
                          className={selectClass}
                          aria-label="Filter value"
                        >
                          <option value="">Select…</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      );
                    }
                    return (
                      <Input
                        value={String(filter.value ?? "")}
                        onChange={(e) => setValue(e.target.value)}
                        className="h-8 w-40 text-sm"
                        placeholder="Value"
                      />
                    );
                  })()}
                <button
                  type="button"
                  onClick={() => setDraftFilters(draftFilters.filter((_, idx) => idx !== i))}
                  className="rounded p-1 text-[#6B7280] hover:text-[#DC2626]"
                  aria-label="Remove filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDraftFilters([
                  ...draftFilters,
                  { field: props.fields[0]?.name ?? "", op: "contains", value: "" },
                ])
              }
            >
              Add filter
            </Button>
            <Button size="sm" onClick={applyFilters}>
              Apply
            </Button>
            {props.filters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftFilters([]);
                  push({ filters: undefined, page: undefined });
                  setShowFilters(false);
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        {/* min-width keeps columns readable on phones: the table scrolls
            horizontally instead of crushing cell content. */}
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {visibleFields.map((field) => (
                <TableHead key={field.name}>
                  <button
                    type="button"
                    onClick={() => toggleSort(field)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-[#111111]",
                      !field.sortable && "cursor-default hover:text-inherit"
                    )}
                  >
                    {field.label}
                    {props.sort?.field === field.name &&
                      (props.sort.dir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
              ))}
              <TableHead className="whitespace-nowrap">Created</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/tables/${props.tableId}/${row.id}`)}
              >
                {visibleFields.map((field) => (
                  <TableCell key={field.name}>
                    <RecordCell field={field} value={row.data[field.name]} />
                  </TableCell>
                ))}
                <TableCell className="whitespace-nowrap text-xs text-[#6B7280]">
                  {new Date(row.createdAt).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/tables/${props.tableId}/${row.id}`}
                      className="rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="View record"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                    {props.canEdit && (
                      <a
                        href={`/tables/${props.tableId}/${row.id}?edit=1`}
                        className="rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Edit record"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </a>
                    )}
                    {props.canDelete && (
                      <button
                        type="button"
                        className="rounded p-1 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#DC2626]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(row.id);
                        }}
                        aria-label="Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {props.rows.length === 0 && (
          <div className="px-4 pb-4">
            <EmptyState
              title={
                props.search || props.filters.length
                  ? "No matching records"
                  : props.page > 1
                    ? "No records on this page"
                    : "No records yet"
              }
              description={
                props.search || props.filters.length
                  ? "Try adjusting your search or filters."
                  : "Imported records will appear here."
              }
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs text-[#6B7280]">
          {props.total.toLocaleString()} record{props.total === 1 ? "" : "s"}
          {refreshing && (
            <span className="inline-flex items-center gap-1" aria-live="polite">
              <Loader2 className="h-3 w-3 animate-spin" /> Updating…
            </span>
          )}
        </p>
        <Pagination
          page={props.page}
          pageCount={Math.max(1, Math.ceil(props.total / props.pageSize))}
          onPageChange={(p) => push({ page: p > 1 ? String(p) : undefined })}
        />
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete record?"
        description="This permanently removes the record. This cannot be undone."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
