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

interface TransactionListProps {
  limit?: number; // Optional limit for recent transactions
  showCaption?: boolean;
}

export function TransactionList({ limit, showCaption = true }: TransactionListProps) {
  const { transactions } = useAppContext();

  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  if (displayTransactions.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card">
        <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Transactions Yet</h3>
        <p className="text-muted-foreground">Add transactions to see your financial history.</p>
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
    <Card className="shadow-md"> {/* Added Card wrapper */}
      <ScrollArea className="h-auto max-h-[500px] rounded-md border"> {/* Max height and border */}
        <Table>
          {showCaption && <TableCaption>A list of your recent transactions.</TableCaption>}
          <TableHeader className="sticky top-0 bg-card z-10"> {/* Sticky header */}
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

// Need to ensure Card is imported if used. Assuming Card from ui/card
import { Card } from "@/components/ui/card";
