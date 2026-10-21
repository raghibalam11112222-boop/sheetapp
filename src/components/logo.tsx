import Link from "next/link";
import { cn } from "@/components/ui/utils";
import { LogoMark } from "@/components/logo-mark";

export function Logo({
  href,
  className,
  compact = false,
}: {
  href?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2 text-[#111318] transition-opacity duration-150 hover:opacity-80", className)}>
      <LogoMark className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")} />
      <span
        className={cn(
          "font-semibold tracking-tight",
          compact ? "text-sm" : "text-lg"
        )}
      >
        SheetApp
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-sm text-[#111318]">
        {content}
      </Link>
    );
  }
  return content;
}
