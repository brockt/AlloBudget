
"use client";

import { useParams, useRouter } from 'next/navigation';
import { TransactionList } from "@/components/transactions/transaction-list";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from '@/types'; // Import Transaction type

export default function AccountTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading, transactions, getAccountById } = useAppContext(); // Assuming getAccountById exists
  const accountId = params.accountId as string;

  const account = getAccountById(accountId); // Fetch account details

  if (isLoading) {
     return (
      <div className="space-y-6">
        <PageHeader title="Account Transactions" description="Loading transactions..." />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  if (!account) {
     return (
      <div className="space-y-6">
        <PageHeader
            title="Error"
            description="Account not found."
             actions={
                <Link href="/dashboard/accounts" passHref>
                    <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Accounts
                    </Button>
                </Link>
             }
        />
      </div>
     )
  }

  const accountTransactions: Transaction[] = transactions.filter(tx => tx.accountId === accountId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${account.name} Transactions`}
        description={`Showing all transactions for the account: ${account.name}`}
        actions={
          <div className='flex gap-2'>
             <Link href="/dashboard/accounts" passHref>
                <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Accounts
                </Button>
            </Link>
            <Link href={`/dashboard/transactions/new?accountId=${accountId}`} passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </Link>
          </div>
        }
      />
      {/* Pass filtered transactions to the list */}
      <TransactionList transactions={accountTransactions} showCaption={false} />
    </div>
  );
}
