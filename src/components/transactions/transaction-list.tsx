
"use client";

import { useAppContext } from "@/context/AppContext";
import { TransactionRow } from "./transaction-row";
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRightLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import type { Transaction } from "@/types"; // Import Transaction type
import { Card } from "@/components/ui/card"; // Assuming Card is used

interface TransactionListProps {
  transactions?: Transaction[]; // Optional: Pass specific transactions to display
  limit?: number; // Optional limit for recent transactions
  showCaption?: boolean;
}

export function TransactionList({ transactions: transactionsProp, limit, showCaption = true }: TransactionListProps) {
  const { transactions: allTransactions } = useAppContext();

  // Use provided transactions if available, otherwise use all from context
  const transactionsToDisplay = transactionsProp || allTransactions;

  const displayTransactions = limit ? transactionsToDisplay.slice(0, limit) : transactionsToDisplay;

  if (displayTransactions.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card">
        <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Transactions Found</h3>
        <p className="text-muted-foreground">There are no transactions matching the current filter.</p>
        <Image
            src="https://picsum.photos/seed/notransactions/400/300"
            alt="Illustration of an empty ledger or graph"
            width={300}
            height={225}
            className="mx-auto mt-6 rounded-lg shadow-md"
            data-ai-hint="empty ledger"
          />
      </div>
    );
  }

  return (
    <Card className="shadow-md">
      <ScrollArea className="h-auto max-h-[500px] rounded-md border">
        <Table>
          {showCaption && transactionsProp === undefined && <TableCaption>A list of all your recent transactions.</TableCaption>}
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Date</TableHead>
              <TableHead className="text-center hidden md:table-cell">Envelope</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
