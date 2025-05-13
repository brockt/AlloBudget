"use client";

import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react'; // Import useState and useEffect

export const dynamic = 'force-dynamic'; // Ensures the page is dynamically rendered

export default function NewTransactionPage() {
  const { isLoading } = useAppContext();
  const searchParams = useSearchParams();

  const [derivedAccountId, setDerivedAccountId] = useState<string | null>(null);
  const [linksReady, setLinksReady] = useState(false);

  useEffect(() => {
    // Only derive accountId and set links as ready when AppContext is no longer loading.
    // This ensures searchParams are accessed after the initial client-side setup.
    if (!isLoading) {
      const accountIdFromQuery = searchParams.get('accountId');
      setDerivedAccountId(accountIdFromQuery);
      setLinksReady(true);
    }
  }, [isLoading, searchParams]);

  // Show skeleton if AppContext is loading or if derived links aren't ready yet.
  if (isLoading || !linksReady) {
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
    );
  }

  // Determine the back link based on the derived accountId
  const backLink = derivedAccountId
    ? `/dashboard/accounts/${derivedAccountId}/transactions`
    : "/dashboard/transactions";
  const backLinkText = derivedAccountId ? "Back to Account Transactions" : "Back to All Transactions";

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