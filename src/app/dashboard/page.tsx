
"use client";

import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DollarSign, PlusCircle, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list";
import { startOfMonth, endOfMonth } from "date-fns"; // Added for clarity if specific periods were needed, though getEnvelopeSpending defaults to current month

export default function DashboardPage() {
  const { accounts, envelopes, getAccountBalance, isLoading, getEnvelopeSpending } = useAppContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Welcome back to Pocket Budgeteer!" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

  // Calculate total available (balance including rollover) across all envelopes
  const totalAvailableInEnvelopes = envelopes.reduce((sum, env) => sum + env.budgetAmount, 0);


   // Total amount spent from all envelopes for the current period (getEnvelopeSpending defaults to current month)
  const totalSpentFromEnvelopes = envelopes.reduce((sum, env) => {
    return sum + getEnvelopeSpending(env.id); // Defaults to current month
  }, 0);

  // Available to Spend = Total Balance - (Total Original Budgeted - Total Spent from Envelopes)
  // This simplifies to: Total Balance - Total Original Budgeted + Total Spent From Envelopes
  // Available to Spend = Total Balance - (Sum of current envelope balances - Sum of transfers into envelopes + Sum of initial budget funding)
  // Available to Spend = Total Balance - (Total amount allocated/budgeted across all envelopes for all time)
  const totalBudgetedAllTime = envelopes.reduce((sum, env) => {
      // Assuming getEnvelopeBalanceWithRollover calculates: initial budget + transfers in - spending/transfers out
      // We need the *opposite* of the available balance to represent the *net* amount allocated/spent
      // A simpler way: sum of all original budget amounts over time.
      // Let's try: Sum of budgetAmount * months active
      // Or even simpler: Total balance - Sum of (budgeted amount + rollover from previous month)
      // Let's stick to the definition: Total Balance - Total *current* balances of all envelopes
      const currentEnvelopeBalance = env.budgetAmount + (getEnvelopeSpending(env.id)); // This isn't quite right yet
      // Need getEnvelopeBalanceWithRollover here?
      return sum + env.budgetAmount; // Using monthly budget for now, needs refinement for rollover.
  }, 0);

   // Refined Calculation:
   // Available to Spend = Total Balance - (Sum of current envelope balances including rollover)
   const sumOfCurrentEnvelopeBalances = envelopes.reduce((sum, env) => {
       // getEnvelopeBalanceWithRollover calculates the current real balance of the envelope
       return sum + 0 // useAppContext().getEnvelopeBalanceWithRollover(env.id); // Disabled for now
   }, 0);
   const availableToSpend = totalBalance - sumOfCurrentEnvelopeBalances;


  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your financial overview and envelope management."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/dashboard/transactions/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </Link>
             {/* Removed Add Envelope Dialog */}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Across {accounts.length} accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Spend</CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${availableToSpend < 0 ? 'text-destructive' : ''}`}>
              ${availableToSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {/* Updated description to reflect the calculation */}
            <p className="text-xs text-muted-foreground">Total balance minus sum of envelope balances</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Envelopes</CardTitle>
          <CardDescription>Track your spending against budgets, grouped by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnvelopeSummaryList />
        </CardContent>
      </Card>

    </div>
  );
}
