"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useAppContext } from "@/context/AppContext";
import { startOfMonth, endOfMonth } from "date-fns";
import type { ChartConfig } from "@/components/ui/chart"

export default function SpendingByEnvelopeChart() {
  const { envelopes, getEnvelopeSpending } = useAppContext();

  const currentMonthPeriod = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

  const chartData = envelopes.map(envelope => ({
    name: envelope.name,
    spent: getEnvelopeSpending(envelope.id, currentMonthPeriod),
    budgeted: envelope.budgetAmount,
  }));

  const chartConfig = {
    spent: {
      label: "Spent",
      color: "hsl(var(--primary))", // Use primary color (Teal)
    },
    budgeted: {
      label: "Budgeted",
      color: "hsl(var(--muted))", // Use a muted color
    },
  } satisfies ChartConfig;


  if (envelopes.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No envelope data to display.</div>;
  }
  
  const filteredChartData = chartData.filter(d => d.spent > 0 || d.budgeted > 0);

  if (filteredChartData.length === 0) {
     return <div className="flex items-center justify-center h-full text-muted-foreground">No spending or budget data for envelopes this month.</div>;
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
            // interval={0} // Show all labels if space allows
            // angle={-30} // Angle labels if they overlap
            // textAnchor="end"
            height={50} // Adjust height for angled labels if used
             tickFormatter={(value) => value.length > 10 ? `${value.substring(0,10)}...` : value} // Truncate long labels
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
          {/* Optional: Show budgeted amount as a reference line or another bar */}
          {/* <Bar dataKey="budgeted" fill="var(--color-budgeted)" radius={4} /> */}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
