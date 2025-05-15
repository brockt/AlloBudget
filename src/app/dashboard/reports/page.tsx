
"use client";

import { PageHeader } from "@/components/PageHeader";
import SpendingByEnvelopeChart from "@/components/charts/spending-by-envelope-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, ChevronLeft, ChevronRight } from "lucide-react"; // Added Chevrons
import { Button } from "@/components/ui/button"; // Added Button
import { format, addMonths, subMonths } from "date-fns"; // Added date-fns functions

export default function ReportsPage() {
  const { isLoading, envelopes, transactions, currentViewMonth, setCurrentViewMonth } = useAppContext();

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
        description={`Spending analysis for ${format(currentViewMonth, "MMMM yyyy")}`}
        actions={ // Month navigation for reports
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentViewMonth(date => subMonths(date, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-28 text-center">
              {format(currentViewMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentViewMonth(date => addMonths(date, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending by Envelope ({format(currentViewMonth, "MMMM")})</CardTitle>
          <CardDescription>
            Expense distribution across budget categories for {format(currentViewMonth, "MMMM yyyy")}.
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
    </div>
  );
}
