
"use client";

import { PageHeader } from "@/components/PageHeader";
import SpendingByEnvelopeChart from "@/components/charts/spending-by-envelope-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "lucide-react";

export default function ReportsPage() {
  const { isLoading, envelopes, transactions } = useAppContext();

  if (isLoading) {
    return (
       <div className="space-y-6">
        <PageHeader title="Reports" description="Analyze your spending patterns." />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyze your spending patterns and financial health."
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending by Envelope (Current Month)</CardTitle>
          <CardDescription>
            See how your expenses are distributed across your budget categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] p-2 sm:p-4 md:p-6">
          {envelopes.length > 0 && transactions.length > 0 ? (
            <SpendingByEnvelopeChart />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <BarChart className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No data available for charts.</p>
                <p className="text-xs text-muted-foreground">Add transactions and envelopes to generate reports.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future charts could go here:
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expense Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] p-6">
          Line chart placeholder
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account Balance Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] p-6">
          Area chart placeholder
        </CardContent>
      </Card>
      */}
    </div>
  );
}
