import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GeneratedField } from "@prisma/client";

function formatNumber(value: number, type: string): string {
  if (type === "PERCENT") return `${value}%`;
  if (type === "CURRENCY") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type Tone = "neutral" | "success" | "warning" | "danger" | "outline";

function optionTone(value: string): Tone {
  const v = value.toLowerCase();
  if (["active", "paid", "shipped", "done", "complete", "completed", "yes", "approved"].includes(v)) return "success";
  if (["pending", "draft", "lead", "in progress", "review"].includes(v)) return "warning";
  if (["cancelled", "canceled", "churned", "failed", "overdue", "no"].includes(v)) return "danger";
  return "neutral";
}

export function RecordCell({
  field,
  value,
}: {
  field: GeneratedField;
  value: unknown;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="inline-flex items-center text-[#6B7280]"><Minus className="h-3.5 w-3.5" /></span>;
  }

  if (field.type === "BOOLEAN") {
    const truthy = value === true || value === "true" || value === "1";
    return truthy ? (
      <Badge variant="success"><Check className="h-3 w-3" /> Yes</Badge>
    ) : (
      <Badge variant="neutral">No</Badge>
    );
  }

  if (field.type === "CURRENCY" || field.type === "NUMBER" || field.type === "PERCENT") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return (
        <span className="tabular-nums text-[#111111]">{formatNumber(n, field.type)}</span>
      );
    }
  }

  if (field.type === "DATE" || field.type === "DATETIME") {
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text) || !Number.isNaN(new Date(text).getTime())) {
      return <span className="whitespace-nowrap text-[#111111]">{formatDate(text)}</span>;
    }
    return <span className="text-[#111111]">{text}</span>;
  }

  if (field.type === "ENUM") {
    const text = String(value);
    return <Badge variant={optionTone(text)}>{text}</Badge>;
  }

  if (field.type === "EMAIL") {
    const text = String(value);
    return (
      <a href={`mailto:${text}`} className="text-[#111111] underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
        {text}
      </a>
    );
  }

  if (field.type === "URL") {
    const text = String(value);
    return (
      <a
        href={text.startsWith("http") ? text : `https://${text}`}
        target="_blank"
        rel="noreferrer"
        className="text-[#111111] underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>
    );
  }

  const text = String(value);
  return (
    <span className={field.type === "LONG_TEXT" ? "line-clamp-2 text-[#111111]" : "text-[#111111]"}>
      {text}
    </span>
  );
}
