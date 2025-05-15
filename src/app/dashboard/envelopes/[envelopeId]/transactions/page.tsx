
"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { TransactionList } from "@/components/transactions/transaction-list";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, isValid } from 'date-fns'; // Import date-fns

export default function EnvelopeTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); // For reading month from query
  const { isLoading, transactions, getEnvelopeById } = useAppContext();
  const envelopeId = params.envelopeId as string;

  // Determine the month to display transactions for
  const monthQueryParam = searchParams.get('month'); // "YYYY-MM"
  let targetMonthDate: Date;

  if (monthQueryParam && isValid(parseISO(`${monthQueryParam}-01`))) {
    targetMonthDate = parseISO(`${monthQueryParam}-01`);
  } else {
    // Fallback to current month if query param is invalid or missing
    targetMonthDate = startOfMonth(new Date());
  }

  const envelope = getEnvelopeById(envelopeId);

  if (isLoading) {
     return (
      <div className="space-y-6 flex flex-col h-full">
        <PageHeader title="Envelope Transactions" description="Loading transactions..." />
        <Skeleton className="h-[400px] w-full rounded-lg flex-grow" />
      </div>
    )
  }

  if (!envelope) {
     return (
      <div className="space-y-6 flex flex-col h-full">
        <PageHeader
            title="Error" description="Envelope not found."
             actions={ <Link href="/dashboard/envelopes" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Envelopes</Button></Link> }
        />
      </div>
     )
  }

  // Filter transactions for the specific envelope AND the target month
  const monthStart = startOfMonth(targetMonthDate);
  const monthEnd = endOfMonth(targetMonthDate);

  const envelopeTransactions: Transaction[] = transactions.filter(tx => {
    if (tx.envelopeId !== envelopeId) return false;
    const txDate = parseISO(tx.date);
    return isValid(txDate) && txDate >= monthStart && txDate <= monthEnd;
  });

  return (
    <div className="space-y-6 flex flex-col h-full">
      <PageHeader
        title={
          <span className='flex items-center'>
            <Package className="mr-2 h-6 w-6 text-primary"/> {envelope.name} Transactions ({format(targetMonthDate, "MMMM yyyy")})
          </span>
        }
        description={`Showing transactions for ${envelope.name} in ${format(targetMonthDate, "MMMM yyyy")}`}
        actions={ <Link href="/dashboard/envelopes" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Envelopes</Button></Link> }
      />
      <TransactionList transactions={envelopeTransactions} showCaption={false} />
    </div>
  );
}
