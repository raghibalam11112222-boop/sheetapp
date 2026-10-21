"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Package,
  FolderKanban,
  Boxes,
  BadgeDollarSign,
  UserCog,
  Ellipsis,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { Logo } from "@/components/logo";

const USE_CASES = [
  { id: "customers", label: "Customers", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "orders", label: "Orders", icon: BadgeDollarSign },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "employees", label: "Employees", icon: UserCog },
  { id: "finance", label: "Finance", icon: Boxes },
  { id: "other", label: "Other", icon: Ellipsis },
  { id: "ai", label: "I'll let AI figure it out", icon: Lightbulb },
];

export function UseCaseStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("customers");

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <Logo href="/dashboard" />
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">
            Step 1 of 3
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#111111]">
            Let&apos;s turn your spreadsheet into an app.
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            What does your business use this spreadsheet for?
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {USE_CASES.map((item) => {
              const Icon = item.icon;
              const active = selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                    active
                      ? "border-[#111111] bg-[#F8F9FA] font-medium text-[#111111]"
                      : "border-[#E5E7EB] text-[#6B7280] hover:border-gray-300 hover:text-[#111111]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <Button
            className="mt-6 w-full"
            onClick={() => router.push(`/onboarding/upload?useCase=${selected}`)}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
