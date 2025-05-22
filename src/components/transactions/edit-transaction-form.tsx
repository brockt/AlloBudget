
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { useEffect, useState } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { transactionSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { Transaction, TransactionFormData, TransactionType, TransactionWithId } from "@/types";
import { CheckCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

interface EditTransactionFormProps {
  transaction: Transaction;
  onSuccess?: () => void;
}

export function EditTransactionForm({ transaction, onSuccess }: EditTransactionFormProps) {
  const { accounts, envelopes, payees, updateTransaction, isLoading: isAppContextLoading } = useAppContext();
  const { toast } = useToast();
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false); // New state to control form rendering

  // console.log("[EditTransactionForm] Rendering with transaction:", JSON.stringify(transaction));
  // console.log("[EditTransactionForm] Context state: isAppContextLoading:", isAppContextLoading, "Accounts:", accounts.length, "Payees:", payees.length, "Envelopes:", envelopes.length);


  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    // Default values are minimal; useEffect with setValue will handle detailed initialization
    defaultValues: {
      type: transaction?.type || "outflow",
      amount: transaction?.amount || 0,
      isTransfer: transaction?.isTransfer || false,
      isActualIncome: transaction?.isActualIncome || false,
      date: transaction?.date ? (isValidDate(parseISO(transaction.date)) ? format(parseISO(transaction.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")) : format(new Date(), "yyyy-MM-dd"),
      accountId: transaction?.accountId || "",
      payeeId: transaction?.payeeId || "",
      envelopeId: transaction?.envelopeId || null,
      description: transaction?.description || "",
    },
  });

  useEffect(() => {
    // console.log("[EditTransactionForm] useEffect triggered. Transaction:", transaction, "isAppContextLoading:", isAppContextLoading, "Accounts:", accounts.length);
    if (transaction && !isAppContextLoading && accounts.length > 0 && payees.length > 0) {
      const outflowRequiresEnvelope = transaction.type === 'outflow' && transaction.envelopeId;
      if (outflowRequiresEnvelope && envelopes.length === 0 && transaction.envelopeId) {
        // console.warn("[EditTransactionForm] Outflow transaction has envelopeId but envelopes list is empty. Form might not init correctly.");
        setIsFormReady(false); // Keep form not ready if crucial data is missing
        return;
      }

      // console.log("[EditTransactionForm] Attempting to set form values.");
      form.setValue('accountId', transaction.accountId || "", { shouldDirty: false, shouldValidate: false });
      form.setValue('payeeId', transaction.payeeId || "", { shouldDirty: false, shouldValidate: false });
      form.setValue('envelopeId', transaction.envelopeId || null, { shouldDirty: false, shouldValidate: false });
      form.setValue('amount', transaction.amount, { shouldDirty: false, shouldValidate: false });
      form.setValue('type', transaction.type, { shouldDirty: false, shouldValidate: false });
      form.setValue('description', transaction.description || "", { shouldDirty: false, shouldValidate: false });
      
      const parsedDate = transaction.date ? parseISO(transaction.date) : null;
      const initialDateString = parsedDate && isValidDate(parsedDate) ? format(parsedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      form.setValue('date', initialDateString, { shouldDirty: false, shouldValidate: false });
      
      form.setValue('isTransfer', transaction.isTransfer || false, { shouldDirty: false, shouldValidate: false });
      form.setValue('isActualIncome', transaction.isActualIncome || false, { shouldDirty: false, shouldValidate: false });
      
      setIsFormReady(true); // Mark form as ready to render
      // console.log("[EditTransactionForm] Form values set. AccountId:", form.getValues('accountId'));
    } else {
      setIsFormReady(false); // Not ready if conditions aren't met
    }
  }, [transaction, form, accounts, payees, envelopes, isAppContextLoading]);

  const transactionType = form.watch("type");

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    // console.log("[EditTransactionForm] Submitting values:", values);
    const updatedTransactionData: TransactionWithId = {
      id: transaction.id,
      ...values,
      description: values.description || undefined,
      envelopeId: values.type === 'inflow' ? null : values.envelopeId,
      isTransfer: values.isTransfer || false,
      isActualIncome: values.type === 'inflow' ? (values.isActualIncome || false) : false,
    };
    updateTransaction(updatedTransactionData)
      .then(() => {
        toast({
          title: "Transaction Updated",
          description: `Transaction has been successfully updated.`,
        });
        if (onSuccess) onSuccess();
      })
      .catch(error => {
        console.error("Error updating transaction:", error);
        toast({
          title: "Error Updating Transaction",
          description: (error as Error)?.message || "Could not update transaction.",
          variant: "destructive",
        });
      });
  }

  if (!isFormReady) {
    // console.log("[EditTransactionForm] Form not ready, showing skeletons.");
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  // console.log("[EditTransactionForm] Rendering form. Current form values:", form.getValues());

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value as TransactionType);
                    if (value === 'inflow') {
                      form.setValue('envelopeId', null);
                    } else {
                       form.setValue('isActualIncome', false);
                    }
                  }}
                  value={field.value}
                  className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="outflow" />
                    </FormControl>
                    <FormLabel className="font-normal">Outflow</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="inflow" />
                    </FormControl>
                    <FormLabel className="font-normal">Inflow</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {transactionType === 'inflow' && (
          <FormField
            control={form.control}
            name="isActualIncome"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Mark as Actual Income?
                  </FormLabel>
                  <FormDescription>
                     Check this if the inflow represents real income (e.g., salary) and not a refund or internal transfer.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="no-accounts-placeholder" disabled>No accounts available</SelectItem>
                  ) : (
                    accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payee</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {payees.length === 0 ? (
                    <SelectItem value="no-payees-placeholder" disabled>No payees available</SelectItem>
                  ) : (
                    payees.map(payee => (
                      <SelectItem key={payee.id} value={payee.id}>
                        {payee.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {transactionType === 'outflow' && (
          <FormField
            control={form.control}
            name="envelopeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Envelope</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)}
                  value={field.value ?? ""}
                  required={transactionType === 'outflow'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an envelope" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {envelopes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                            No envelopes available.
                        </div>
                     ) : (
                        envelopes.map(envelope => (
                          <SelectItem key={envelope.id} value={envelope.id}>
                            {envelope.name} ({envelope.category})
                          </SelectItem>
                        ))
                     )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01"
                       onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                       value={field.value ?? 0} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries, Salary" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      onClick={(e) => {
                        e.preventDefault(); // Prevent form submission
                        // console.log("[EditTransactionForm] Date button clicked. Current isDatePopoverOpen:", isDatePopoverOpen);
                        setIsDatePopoverOpen(prev => !prev);
                      }}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value && isValidDate(parseISO(field.value)) ? (
                        format(parseISO(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value && isValidDate(parseISO(field.value)) ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      // console.log("[EditTransactionForm] Date selected from Calendar:", date);
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                      setIsDatePopoverOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={
            isAppContextLoading ||
            payees.length === 0 ||
            accounts.length === 0 ||
            (form.getValues('type') === 'outflow' && !!transaction.envelopeId && envelopes.length === 0)
          }
        >
          <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </form>
    </Form>
  );
}

    