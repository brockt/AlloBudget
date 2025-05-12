
"use client";

import type { Transaction } from "@/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns"; // Import parseISO and isValid
import { useAppContext } from "@/context/AppContext";
import { ArrowUpCircle, ArrowDownCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Added missing import


interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const { accounts, envelopes, deleteTransaction } = useAppContext();
  const { toast } = useToast();

  const account = accounts.find(acc => acc.id === transaction.accountId);
  const envelope = transaction.envelopeId ? envelopes.find(env => env.id === transaction.envelopeId) : null;

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    toast({
      title: "Transaction Deleted",
      description: "The transaction has been successfully deleted.",
      variant: "destructive"
    });
  };

  // Safely parse and format the date
  const transactionDate = parseISO(transaction.date);
  const formattedDate = isValid(transactionDate) ? format(transactionDate, "MMM d, yyyy") : "Invalid Date";

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell>
        <div className="font-medium">{transaction.description || <span className="italic text-muted-foreground">No description</span>}</div>
        <div className="text-xs text-muted-foreground">{account?.name || "N/A"}</div>
      </TableCell>
      <TableCell className="text-center hidden sm:table-cell">
        {formattedDate}
      </TableCell>
      <TableCell className="text-center hidden md:table-cell">
        {envelope ? (
          <Badge variant="outline">{envelope.name}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <span className={cn(
          "font-semibold flex items-center justify-end",
          transaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
        )}>
          {transaction.type === 'income' ?
            <ArrowUpCircle className="mr-1 h-4 w-4" /> :
            <ArrowDownCircle className="mr-1 h-4 w-4" />
          }
          ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete Transaction</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the transaction{' '}
                {transaction.description ? `"${transaction.description}"` : "(with no description)"}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
