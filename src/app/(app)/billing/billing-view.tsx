"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { changePlanAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";

export interface BillingState {
  currentPlan: string;
  status: string;
  periodEnd: string | null;
  usage: { records: number; apps: number; seats: number };
  canManage: boolean;
  plans: {
    id: string;
    label: string;
    price: number;
    records: number;
    apps: number;
    seats: number;
  }[];
}

function meter(value: number, limit: number) {
  const pct = Math.min(100, Math.round((value / Math.max(limit, 1)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#6B7280]">
        <span>
          {value.toLocaleString()} / {limit.toLocaleString()}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className={cn("h-full rounded-full bg-[#111111]", pct > 90 && "bg-[#D97706]")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BillingView({ state }: { state: BillingState }) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const current = state.plans.find((p) => p.id === state.currentPlan) ?? state.plans[0];

  async function switchPlan(planId: string) {
    setSwitching(planId);
    const result = await changePlanAction(planId);
    setSwitching(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Switched to ${planId} plan (demo billing)`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">
              Current plan — {current.label}
            </CardTitle>
            <Badge variant={state.status === "ACTIVE" ? "success" : "warning"}>
              {state.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-3">
            <p className="text-2xl font-semibold text-[#111111]">
              ${current.price}
              <span className="text-sm font-normal text-[#6B7280]">/mo</span>
            </p>
            {state.periodEnd && (
              <p className="text-xs text-[#6B7280]">
                Renews {new Date(state.periodEnd).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Records</p>
            {meter(state.usage.records, current.records)}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Seats</p>
            {meter(state.usage.seats, current.seats)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.plans.map((plan) => {
          const isCurrent = plan.id === state.currentPlan;
          return (
            <Card
              key={plan.id}
              className={cn(isCurrent && "border-[#111111] shadow-md")}
            >
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#111111]">{plan.label}</p>
                  {isCurrent && <Badge variant="default">Current</Badge>}
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#111111]">
                  ${plan.price}
                  <span className="text-sm font-normal text-[#6B7280]">/mo</span>
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-[#6B7280]">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-[#16A34A]" /> {plan.records.toLocaleString()} records
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-[#16A34A]" /> {plan.apps} applications
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-[#16A34A]" /> {plan.seats} seats
                  </li>
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={isCurrent ? "secondary" : "primary"}
                  size="sm"
                  disabled={isCurrent || !state.canManage}
                  loading={switching === plan.id}
                  onClick={() => switchPlan(plan.id)}
                >
                  {isCurrent ? "Current plan" : `Switch to ${plan.label}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!state.canManage && (
        <p className="text-sm text-[#6B7280]">Only admins can change billing.</p>
      )}
    </div>
  );
}
