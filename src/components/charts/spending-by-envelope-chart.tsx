
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useAppContext } from "@/context/AppContext";
import type { ChartConfig } from "@/components/ui/chart"
import { format } from "date-fns"; // Import format

export default function SpendingByEnvelopeChart() {
  const { envelopes, getEnvelopeSpending, getMonthlyAllocation, currentViewMonth } = useAppContext(); // Added getMonthlyAllocation and currentViewMonth

  // Data for the currentViewMonth
  const chartData = envelopes.map(envelope => ({
    name: envelope.name,
    spent: getEnvelopeSpending(envelope.id, currentViewMonth), // Use currentViewMonth
    budgeted: getMonthlyAllocation(envelope.id, currentViewMonth), // Get allocation for currentViewMonth
  }));

  const chartConfig = {
    spent: { label: "Spent", color: "hsl(var(--primary))" },
    budgeted: { label: "Budgeted", color: "hsl(var(--muted))" },
  } satisfies ChartConfig;

  if (envelopes.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No envelope data to display.</div>;
  }

  const filteredChartData = chartData.filter(d => d.spent > 0 || d.budgeted > 0);

  if (filteredChartData.length === 0) {
     return <div className="flex items-center justify-center h-full text-muted-foreground">No spending or budget data for {format(currentViewMonth, "MMMM yyyy")}.</div>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filteredChartData} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            height={50}
            tickFormatter={(value) => value.length > 10 ? `${value.substring(0,10)}...` : value}
          />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="spent" fill="var(--color-spent)" radius={4} />
          {/* Optional: Show budgeted amount as a reference bar if needed */}
          {/* <Bar dataKey="budgeted" fill="var(--color-budgeted)" radius={4} /> */}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
