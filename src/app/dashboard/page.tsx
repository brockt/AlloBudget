
"use client";

import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DollarSign, Landmark, Mails, ArrowRightLeft, PlusCircle, TrendingUp, BarChart, Wallet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import SpendingByEnvelopeChart from "@/components/charts/spending-by-envelope-chart"; 
import RecentTransactionsList from "@/components/transactions/recent-transactions-list"; 
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list"; 

export default function DashboardPage() {
  const { accounts, envelopes, transactions, getAccountBalance, isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Welcome back to Pocket Budgeteer!" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"> {/* Adjusted grid for 4 cards */}
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  const totalBudgeted = envelopes.reduce((sum, env) => sum + env.budgetAmount, 0);
  const availableToSpend = totalBalance - totalBudgeted;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your financial overview at a glance."
        actions={
          <Link href="/dashboard/transactions/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"> {/* Adjusted grid for 4 cards */}
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
            <CardTitle className="text-sm font-medium">Total Monthly Budget</CardTitle>
            <Mails className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Across {envelopes.length} envelopes</p>
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
            <p className="text-xs text-muted-foreground">Funds not allocated to envelopes</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">Recorded transactions</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>A quick look at your latest financial activities.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactionsList limit={5} />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Envelope Summary</CardTitle>
            <CardDescription>Track your spending against budgets.</CardDescription>
          </CardHeader>
          <CardContent>
            <EnvelopeSummaryList />
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending Overview</CardTitle>
          <CardDescription>Visualize your spending by envelope for the current month.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] p-2 sm:p-4 md:p-6">
          {envelopes.length > 0 && transactions.length > 0 ? (
            <SpendingByEnvelopeChart />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <BarChart className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No spending data available yet.</p>
                <p className="text-xs text-muted-foreground">Add some transactions and envelopes to see your spending chart.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

