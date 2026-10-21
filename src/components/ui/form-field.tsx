"use client";

import * as React from "react";
import { cn } from "./utils";
import { Label } from "./label";

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-[12.5px] text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[12.5px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
