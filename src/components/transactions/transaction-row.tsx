
"use client";

import type { Transaction } from "@/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns"; // Import parseISO and isValid
import { useAppContext } from "@/context/AppContext";
import { ArrowUpCircle, ArrowDownCircle, Trash2, User, Pencil, Landmark } from "lucide-react"; // Added Landmark
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
import { cn } from "@/lib/utils";


interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void; // Add onEdit handler prop
}

export function TransactionRow({ transaction, onEdit }: TransactionRowProps) {
  const { accounts, envelopes, payees, deleteTransaction } = useAppContext(); // Added payees
  const { toast } = useToast();

  const account = accounts.find(acc => acc.id === transaction.accountId);
  const envelope = transaction.envelopeId ? envelopes.find(env => env.id === transaction.envelopeId) : null;
  const payee = transaction.payeeId ? payees.find(p => p.id === transaction.payeeId) : null; // Find payee

  const handleDelete = () => {
    deleteTransaction(transaction.id)
      .then(() => {
        toast({
          title: "Transaction Deleted",
          description: "The transaction has been successfully deleted.",
          variant: "destructive"
        });
      })
      .catch((error) => {
        toast({
          title: "Error Deleting Transaction",
          description: (error as Error)?.message || "Could not delete transaction. Please try again.",
          variant: "destructive"
        });
      });
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent potential parent link navigation if row becomes clickable later
    onEdit(transaction);
  };


  // Safely parse and format the date
  const transactionDate = parseISO(transaction.date);
  const formattedDate = isValid(transactionDate) ? format(transactionDate, "MMM d, yyyy") : "Invalid Date";

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell>
        <div className="font-medium flex items-center">
          {payee ? (
            <>
              <User className="mr-1.5 h-4 w-4 text-muted-foreground" />
              {payee.name}
            </>
          ) : (
            <span className="italic text-muted-foreground">No Payee</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground ml-5"> {/* Indent description slightly */}
          {transaction.description || <span className="italic text-muted-foreground">No description</span>}
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-0.5 ml-5"> {/* Indent account slightly */}
          <Landmark className="mr-1.5 h-3 w-3" />
          {account?.name || "N/A"}
        </div>
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
         <div className="flex justify-end space-x-1">
            {/* Edit Button */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-7 w-7" onClick={handleEditClick}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Transaction</span>
            </Button>
            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-7 w-7">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete Transaction</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the transaction
                    for {payee ? `"${payee.name}"` : "this payee"}
                    {transaction.description ? ` regarding "${transaction.description}"` : ""}.
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
        </div>
      </TableCell>
    </TableRow>
  );
}
