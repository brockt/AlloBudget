

"use client";

import { TransactionList } from "@/components/transactions/transaction-list";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsPage() {
  const { isLoading } = useAppContext();

  // Note: The edit dialog logic is currently inside TransactionList.
  // If needed, it could be moved here for better separation.

  if (isLoading) {
     return (
      <div className="space-y-6">
        <PageHeader title="All Transactions" description="A complete history of your financial activities." />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Transactions"
        description="A complete history of your financial activities."
        actions={
          <Link href="/dashboard/transactions/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Transaction
            </Button>
          </Link>
        }
      />
      {/* TransactionList now contains the Edit dialog */}
      <TransactionList />
    </div>
  );
}
