export const PLAN_LIMITS: Record<
  string,
  { records: number; apps: number; seats: number; label: string; price: number }
> = {
  FREE: { records: 500, apps: 1, seats: 3, label: "Free", price: 0 },
  STARTER: { records: 5_000, apps: 5, seats: 10, label: "Starter", price: 29 },
  BUSINESS: { records: 50_000, apps: 25, seats: 25, label: "Business", price: 79 },
  PRO: { records: 500_000, apps: 100, seats: 100, label: "Pro", price: 149 },
};
