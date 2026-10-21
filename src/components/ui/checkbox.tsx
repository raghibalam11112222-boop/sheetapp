"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "./utils";

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <label
      className={cn(
        "relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-border-strong bg-surface transition-colors",
        "has-[:checked]:border-primary has-[:checked]:bg-primary",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className
      )}
    >
      <input
        type="checkbox"
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        {...props}
      />
      <Check className="size-3 text-primary-foreground opacity-0 has-[:checked]:opacity-100" strokeWidth={3} />
    </label>
  );
}
