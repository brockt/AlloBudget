
"use client";

import { useAppContext } from "@/context/AppContext";
import { TableCell, TableRow, Table, TableBody, TableHead, TableHeader } from "@/components/ui/table"; // Added TableCell, TableRow imports
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface RecentTransactionsListProps {
  limit?: number;
}

export default function RecentTransactionsList({ limit = 5 }: RecentTransactionsListProps) {
  const { transactions, accounts } = useAppContext(); // Added accounts for name lookup

  const recentTransactions = transactions.slice(0, limit);

  if (recentTransactions.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No recent transactions.</p>
        <Link href="/dashboard/transactions/new" passHref className="mt-2">
          <Button variant="link" className="text-primary">Add your first transaction</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-auto max-h-[300px] rounded-md"> {/* Adjusted max height */}
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map((transaction) => (
              // Using a simplified row structure for dashboard
              <TableRow key={transaction.id} className="hover:bg-muted/50 transition-colors">
                 <TableCell>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-xs text-muted-foreground">
                        {accounts.find(a => a.id === transaction.accountId)?.name || ''}
                    </div>
                 </TableCell>
                 <TableCell className="text-center hidden sm:table-cell">
                    {new Date(transaction.date).toLocaleDateString()}
                 </TableCell>
                 <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                 </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {transactions.length > limit && (
        <div className="text-center mt-2">
          <Link href="/dashboard/transactions" passHref>
            <Button variant="link" className="text-sm text-primary">
              View All Transactions <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
