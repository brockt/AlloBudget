"use client";

import { Suspense, useState, useEffect } from 'react'; // Combine React imports
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";

// This component contains the logic that uses useSearchParams
function NewTransactionPageContent() {
  const { isLoading } = useAppContext();
  const searchParams = useSearchParams(); // useSearchParams is called here

  const [derivedAccountId, setDerivedAccountId] = useState<string | null>(null);
  const [linksReady, setLinksReady] = useState(false);

  useEffect(() => {
    // This effect runs on the client after initial render and when dependencies change.
    // useSearchParams() is safe to use here.
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

// This is the default export for the page route
export default function NewTransactionPage() {
  // Fallback UI for Suspense
  const SkeletonFallback = (
    <div className="space-y-6">
      <PageHeader title="New Transaction" description="Loading transaction form..." />
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

  return (
    <Suspense fallback={SkeletonFallback}>
      <NewTransactionPageContent />
    </Suspense>
  );
}