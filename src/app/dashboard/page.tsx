
"use client";

import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DollarSign, PlusCircle, Wallet, TrendingUp, TrendingDown, PackagePlus, CalendarCheck } from "lucide-react"; // Added new icons
import { Skeleton } from "@/components/ui/skeleton";
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list";

// Helper function for currency formatting
const formatCurrency = (amount: number): string => {
  // Use user's locale and default currency (USD for now)
  // Consider making currency configurable later
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

export default function DashboardPage() {
  const {
    accounts,
    envelopes,
    getAccountBalance,
    isLoading,
    getMonthlyIncomeTotal,
    getMonthlySpendingTotal,
    getTotalMonthlyBudgeted,
    getYtdIncomeTotal,
  } = useAppContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Updated App Name */}
        <PageHeader title="Dashboard" description="Welcome back to AlloBudget!" />
        {/* Skeletons for summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        {/* Skeletons for balance/available cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        {/* Skeleton for Envelope list */}
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
  const totalMonthlyBudgeted = getTotalMonthlyBudgeted();
  const availableToSpend = totalBalance - totalMonthlyBudgeted;

  const monthlyIncome = getMonthlyIncomeTotal();
  const monthlySpending = getMonthlySpendingTotal();
  const ytdIncome = getYtdIncomeTotal();

  return (
    <div className="space-y-6 flex flex-col h-full"> {/* Use flex column and full height */}
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
          </div>
        }
      />

      {/* Monthly and YTD Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Monthly Income */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600 dark:text-green-500">
              {formatCurrency(monthlyIncome)}
            </div>
             <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
         {/* Monthly Spending */}
         <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-red-600 dark:text-red-500">
              {formatCurrency(monthlySpending)}
            </div>
             <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
         {/* Monthly Budgeted */}
         <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budgeted</CardTitle>
            <PackagePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatCurrency(totalMonthlyBudgeted)}
            </div>
             <p className="text-xs text-muted-foreground">Across {envelopes.length} envelopes</p>
          </CardContent>
        </Card>
         {/* YTD Income */}
         <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Income</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatCurrency(ytdIncome)}
            </div>
            <p className="text-xs text-muted-foreground">Since start of year</p>
          </CardContent>
        </Card>
      </div>


      {/* Total Balance and Available to Spend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance)}
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
              {formatCurrency(availableToSpend)}
            </div>
            <p className="text-xs text-muted-foreground">Total balance minus total monthly budgeted</p>
          </CardContent>
        </Card>
      </div>

       {/* Envelope Summary List - Make Card flex-grow */}
      <Card className="shadow-lg flex-grow flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>All Envelopes</CardTitle>
          {/* Removed CardDescription from here */}
        </CardHeader>
        {/* Ensure CardContent takes remaining space and allows internal scrolling */}
        <CardContent className="flex-grow overflow-hidden">
           {/* EnvelopeSummaryList contains the ScrollArea */}
          <EnvelopeSummaryList />
        </CardContent>
      </Card>

    </div>
  );
}

