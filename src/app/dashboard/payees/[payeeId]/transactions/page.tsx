
"use client";

import { useParams, useRouter } from 'next/navigation';
import { TransactionList } from "@/components/transactions/transaction-list";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from '@/types'; // Import Transaction type

export default function PayeeTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading, transactions, payees, getPayeeTransactions } = useAppContext();
  const payeeId = params.payeeId as string;

  const payee = payees.find(p => p.id === payeeId); // Find the payee

  if (isLoading) {
     return (
      <div className="space-y-6">
        <PageHeader title="Payee Transactions" description="Loading transactions..." />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  if (!payee) {
     return (
      <div className="space-y-6">
        <PageHeader
            title="Error"
            description="Payee not found."
             actions={
                <Link href="/dashboard/payees" passHref>
                    <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payees
                    </Button>
                </Link>
             }
        />
      </div>
     )
  }

  const payeeTransactions: Transaction[] = getPayeeTransactions(payeeId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className='flex items-center'>
            <User className="mr-2 h-6 w-6 text-primary"/> {payee.name} Transactions
          </span>
        }
        description={`Showing all transactions associated with the payee: ${payee.name}`}
        actions={
            <Link href="/dashboard/payees" passHref>
                <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payees
                </Button>
            </Link>
        }
      />
      {/* Pass filtered transactions to the list */}
      <TransactionList transactions={payeeTransactions} showCaption={false} />
    </div>
  );
}
