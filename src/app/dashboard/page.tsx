
"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { DollarSign, PlusCircle, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list";
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
  const { accounts, envelopes, getAccountBalance, isLoading } = useAppContext();
  const [isAddEnvelopeDialogOpen, setIsAddEnvelopeDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Welcome back to Pocket Budgeteer!" />
        <div className="grid gap-6 md:grid-cols-2">
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

      <div className="grid gap-6 md:grid-cols-2">
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
          <CardTitle>Envelope Balances</CardTitle>
          <CardDescription>Track your spending against budgets for all envelopes.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnvelopeSummaryList />
        </CardContent>
      </Card>

    </div>
  );
}
