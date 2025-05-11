
"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DollarSign, PlusCircle, Wallet, Users, BarChart3 as ReportsIcon, Landmark as AccountsIcon, History as RecentTransactionsIcon } from "lucide-react"; // Added Users for Payees
import { Skeleton } from "@/components/ui/skeleton";
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list";
import RecentTransactionsList from "@/components/transactions/recent-transactions-list";
import { AccountList } from "@/components/accounts/account-list";
import SpendingByEnvelopeChart from "@/components/charts/spending-by-envelope-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddEnvelopeForm } from "@/components/envelopes/add-envelope-form";

export default function DashboardPage() {
  const { accounts, envelopes, getAccountBalance, isLoading, transactions } = useAppContext();
  const [isAddEnvelopeDialogOpen, setIsAddEnvelopeDialogOpen] = useState(false);

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
        <Card className="shadow-lg mt-6">
           <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-2"/>
           </CardHeader>
           <CardContent>
            <Skeleton className="h-64 rounded-lg"/>
           </CardContent>
        </Card>
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
        description="Your financial overview and envelope management."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/dashboard/transactions/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </Link>
            <Dialog open={isAddEnvelopeDialogOpen} onOpenChange={setIsAddEnvelopeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Envelope
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Envelope</DialogTitle>
                  <DialogDescription>
                    Define a new category for your budget.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <AddEnvelopeForm onSuccess={() => setIsAddEnvelopeDialogOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
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
            <p className="text-xs text-muted-foreground">Total balance minus total budgeted in envelopes</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Envelopes</CardTitle>
          <CardDescription>Track your spending against budgets for all your envelopes.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnvelopeSummaryList />
        </CardContent>
      </Card>

      <Tabs defaultValue="recent-transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="recent-transactions">
            <RecentTransactionsIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
            Recent Transactions
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <AccountsIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="payees">
            <Users className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
            Payees
          </TabsTrigger>
          <TabsTrigger value="reports">
            <ReportsIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent-transactions">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>A quick look at your latest transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTransactionsList limit={10} showViewAllLink={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>Summary of your financial accounts. <Link href="/dashboard/accounts" className="text-primary hover:underline">Manage all accounts</Link>.</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payees">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Payees</CardTitle>
              <CardDescription>Manage your frequent payees.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed rounded-lg p-4">
                <Users className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Payee management is coming soon!</p>
                <p className="text-xs text-muted-foreground mt-1">You'll be able to add, edit, and manage your payees here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Spending by Envelope (Current Month)</CardTitle>
              <CardDescription>
                Snapshot of your expenses by category. For more detailed reports, <Link href="/dashboard/reports" className="text-primary hover:underline">visit the Reports page</Link>.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] p-2 sm:p-4 md:p-6">
              {envelopes.length > 0 && transactions.length > 0 ? (
                <SpendingByEnvelopeChart />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ReportsIcon className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No data available for charts.</p>
                  <p className="text-xs text-muted-foreground">Add transactions and envelopes to generate reports.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

