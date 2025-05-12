
"use client";

import { useParams, useRouter } from 'next/navigation';
import { TransactionList } from "@/components/transactions/transaction-list";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react"; // Use Package icon
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from '@/types'; // Import Transaction type

export default function EnvelopeTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading, transactions, getEnvelopeById } = useAppContext();
  const envelopeId = params.envelopeId as string;

  const envelope = getEnvelopeById(envelopeId); // Fetch envelope details

  if (isLoading) {
     return (
      <div className="space-y-6">
        <PageHeader title="Envelope Transactions" description="Loading transactions..." />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  if (!envelope) {
     return (
      <div className="space-y-6">
        <PageHeader
            title="Error"
            description="Envelope not found."
             actions={
                <Link href="/dashboard/envelopes" passHref>
                    <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Envelopes
                    </Button>
                </Link>
             }
        />
      </div>
     )
  }

  // Filter transactions: includes both income and expense associated with this envelope
  const envelopeTransactions: Transaction[] = transactions.filter(tx => tx.envelopeId === envelopeId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className='flex items-center'>
            <Package className="mr-2 h-6 w-6 text-primary"/> {envelope.name} Transactions
          </span>
        }
        description={`Showing all transactions associated with the envelope: ${envelope.name}`}
        actions={
          <Link href="/dashboard/envelopes" passHref>
            <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Envelopes
            </Button>
          </Link>
        }
      />
      {/* Pass filtered transactions to the list */}
      <TransactionList transactions={envelopeTransactions} showCaption={false} />
    </div>
  );
}
