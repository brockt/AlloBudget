
"use client";

// import { useAppContext } from "@/context/AppContext"; // Commented out
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DollarSign, PlusCircle, Wallet, TrendingUp, TrendingDown, Package, CalendarCheck, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
// import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list"; // Commented out
import { format, parseISO, isValid as isValidDate, addMonths, subMonths } from 'date-fns';

// const formatCurrency = (amount: number): string => {
//   return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
// };

export default function DashboardPage() {
  // const {
  //   accounts,
  //   envelopes,
  //   getAccountBalance,
  //   isLoading,
  //   getMonthlyIncomeTotal,
  //   getMonthlySpendingTotal,
  //   lastModified,
  //   currentViewMonth,
  //   setCurrentViewMonth,
  //   getEffectiveMonthlyBudgetWithRollover,
  //   getEnvelopeSpending, // Added for more precise available to spend
  // } = useAppContext();

  // if (isLoading) { // Assuming isLoading might come from somewhere else or we simplify
  //   return (
  //     <div className="space-y-6">
  //       <PageHeader title="Dashboard" description="Welcome back to AlloBudget!" />
  //       <p className="text-xs italic text-muted-foreground mb-4">Loading data...</p>
  //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  //         <Skeleton className="h-28 rounded-lg" /> <Skeleton className="h-28 rounded-lg" />
  //         <Skeleton className="h-28 rounded-lg" /> <Skeleton className="h-28 rounded-lg" />
  //       </div>
  //       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  //         <Skeleton className="h-32 rounded-lg" /> <Skeleton className="h-32 rounded-lg" />
  //       </div>
  //       <Card className="shadow-lg">
  //         <CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
  //         <CardContent><Skeleton className="h-72 rounded-lg" /></CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  // const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  // const monthlyIncome = getMonthlyIncomeTotal(currentViewMonth);
  // const monthlySpendingAllSources = getMonthlySpendingTotal(currentViewMonth); // Spending from all sources

  // const totalEffectiveBudgetedForViewMonth = envelopes.reduce((sum, envelope) => {
  //   return sum + getEffectiveMonthlyBudgetWithRollover(envelope.id, currentViewMonth);
  // }, 0);

  // // Available to Spend = Total Account Balance - Total Amount Allocated to Envelopes for the Current Month (including rollovers)
  // const availableToSpend = totalBalance - totalEffectiveBudgetedForViewMonth;

  // const ytdIncome = getYtdIncomeTotal();

  // const formattedLastModified = lastModified && isValidDate(parseISO(lastModified))
  //   ? format(parseISO(lastModified), "MMM d, yyyy 'at' h:mm a")
  //   : "Data not yet modified or unavailable.";
  
  //  const currentViewMonth = new Date(); // Placeholder
  //  const setCurrentViewMonth = (fn: any) => {}; // Placeholder
  //  const lastModified = new Date().toISOString(); // Placeholder


  return (
    <div className="space-y-6 flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        description={`Financial overview`}
        // description={`Financial overview for ${format(currentViewMonth, "MMMM yyyy")}`}
        // actions={
        //   <div className="flex items-center gap-2">
        //     <Button variant="outline" size="icon" onClick={() => setCurrentViewMonth(date => subMonths(date, 1))} aria-label="Previous month">
        //       <ChevronLeft className="h-4 w-4" />
        //     </Button>
        //     <span className="text-sm font-medium w-28 text-center">
        //       {/* {format(currentViewMonth, "MMMM yyyy")} */}
        //       Month Year
        //     </span>
        //     <Button variant="outline" size="icon" onClick={() => setCurrentViewMonth(date => addMonths(date, 1))} aria-label="Next month">
        //       <ChevronRight className="h-4 w-4" />
        //     </Button>
        //     <Link href="/dashboard/transactions/new" passHref className="ml-4">
        //       <Button>
        //         <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
        //       </Button>
        //     </Link>
        //   </div>
        // }
      />
      {/* <p className="text-xs italic text-muted-foreground -mt-4 mb-4 flex items-center">
        <Edit3 className="mr-1.5 h-3 w-3" /> Last modified: {formattedLastModified}
      </p> */}
      <p>Dashboard content is loading...</p>

      {/* All cards are commented out to simplify the page */}
      {/*
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income ({format(currentViewMonth, "MMM")})</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600 dark:text-green-500">{formatCurrency(monthlyIncome)}</div>
            <p className="text-xs text-muted-foreground">For {format(currentViewMonth, "MMMM")}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending ({format(currentViewMonth, "MMM")})</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-red-600 dark:text-red-500">{formatCurrency(monthlySpendingAllSources)}</div>
            <p className="text-xs text-muted-foreground">For {format(currentViewMonth, "MMMM")}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funds in Envelopes ({format(currentViewMonth, "MMM")})</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(totalEffectiveBudgetedForViewMonth)}</div>
            <p className="text-xs text-muted-foreground">Allocations + rollover for {format(currentViewMonth, "MMMM")}.</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Income</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(ytdIncome)}</div>
            <p className="text-xs text-muted-foreground">Since start of year</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Account Balance</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Across {accounts.length} accounts (current)</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Spend</CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${availableToSpend < 0 ? 'text-destructive dark:text-red-400' : ''}`}>
              {formatCurrency(availableToSpend)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total balance minus total allocated to envelopes for {format(currentViewMonth, "MMMM")}.
            </p>
          </CardContent>
        </Card>
      </div>
      */}

      {/* EnvelopeSummaryList also commented out
      <Card className="shadow-lg flex-grow flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>Envelopes for {format(currentViewMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <EnvelopeSummaryList />
        </CardContent>
      </Card>
      */}
    </div>
  );
}
