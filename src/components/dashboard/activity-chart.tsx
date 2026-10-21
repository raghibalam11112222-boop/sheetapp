"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ActivityChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (!data.length) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-[#6B7280]">
        No records created in the last 7 days.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    records: d.count,
  }));

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="recordsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111111" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={{ stroke: "#E5E7EB" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            labelStyle={{ color: "#111111" }}
          />
          <Area
            type="monotone"
            dataKey="records"
            stroke="#111111"
            strokeWidth={2}
            fill="url(#recordsFill)"
            name="Records"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
