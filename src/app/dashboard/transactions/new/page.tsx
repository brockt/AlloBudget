
"use client";

import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

export default function NewTransactionPage() {
  const { isLoading } = useAppContext();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('accountId'); // Check if accountId is in query

  // Determine the back link based on whether accountId is present
  const backLink = accountId
    ? `/dashboard/accounts/${accountId}/transactions`
    : "/dashboard/transactions";
  const backLinkText = accountId ? "Back to Account Transactions" : "Back to All Transactions";


  if (isLoading) {
     return (
      <div className="space-y-6">
        <PageHeader title="New Transaction" description="Record a new income or expense."/>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Transaction"
        description="Record a new income or expense."
        actions={
          <Link href={backLink} passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> {backLinkText}
            </Button>
          </Link>
        }
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Enter Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pass navigateToTransactions so it redirects correctly */}
          <AddTransactionForm navigateToTransactions={true} />
        </CardContent>
      </Card>
    </div>
  );
}
