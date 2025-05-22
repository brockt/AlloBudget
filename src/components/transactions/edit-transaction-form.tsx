
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
import { Skeleton } from "@/components/ui/skeleton";

interface EditTransactionFormProps {
  transaction: Transaction;
  onSuccess?: () => void;
}

export function EditTransactionForm({ transaction, onSuccess }: EditTransactionFormProps) {
  const { accounts, envelopes, payees, updateTransaction, isLoading: isAppContextLoading } = useAppContext();
  const { toast } = useToast();
  const [isFormReady, setIsFormReady] = useState(false);
  // Removed isDatePopoverOpen state as Popover is now uncontrolled

  // console.log(`[EditTF Render] Top Level. Tx ID: ${transaction?.id}, AppLoading: ${isAppContextLoading}, Accounts: ${accounts.length}, Payees: ${payees.length}`);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    // Default values are set by useEffect to ensure lists are populated
    // and transaction prop is fully processed
  });

  useEffect(() => {
    // console.log(`[EditTF useEffect] Fired. Tx ID: ${transaction?.id}, AppLoading: ${isAppContextLoading}, Accounts: ${accounts.length}, Payees: ${payees.length}`);
    if (transaction && !isAppContextLoading && accounts.length > 0 && payees.length > 0) {
      const outflowRequiresEnvelope = transaction.type === 'outflow' && transaction.envelopeId;
      if (outflowRequiresEnvelope && envelopes.length === 0 && transaction.envelopeId) {
        // console.warn("[EditTF useEffect] Outflow transaction has envelopeId but envelopes list is empty. Deferring setValue.");
        setIsFormReady(false); // Keep showing skeletons if crucial data for form init isn't ready
        return;
      }

      const parsedDate = transaction.date ? parseISO(transaction.date) : null;
      const initialDateString = parsedDate && isValidDate(parsedDate) ? format(parsedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

      // console.log("[EditTF useEffect] Attempting to set values. AccountId:", transaction.accountId, "PayeeId:", transaction.payeeId, "EnvelopeId:", transaction.envelopeId);
      form.setValue('accountId', transaction.accountId || "");
      form.setValue('payeeId', transaction.payeeId || "");
      form.setValue('envelopeId', transaction.type === 'outflow' ? (transaction.envelopeId || null) : null);
      form.setValue('amount', transaction.amount);
      form.setValue('type', transaction.type);
      form.setValue('description', transaction.description || "");
      form.setValue('date', initialDateString);
      form.setValue('isTransfer', transaction.isTransfer || false);
      form.setValue('isActualIncome', transaction.isActualIncome || false);
      
      // console.log("[EditTF useEffect] Form values set. Current form values:", JSON.stringify(form.getValues()));
      setIsFormReady(true);
    } else {
      // console.log("[EditTF useEffect] Conditions not met for setting values or marking form ready.");
      setIsFormReady(false);
    }
  }, [transaction, form, accounts, payees, envelopes, isAppContextLoading]);


  const transactionType = form.watch("type");

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    // console.log("[EditTF onSubmit] Submitting values:", JSON.stringify(values));
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
    // console.log("[EditTF Render] Form not ready, showing skeletons.");
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  // console.log(`[EditTF Render] Form is ready. AccountId form value: ${form.getValues('accountId')}`);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Transaction Type Radio Group */}
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
                      // isActualIncome can be true for inflow, so we don't reset it here
                    } else { // outflow
                       form.setValue('isActualIncome', false); // Reset if switching to outflow
                       // For outflow, envelopeId might need to be re-evaluated or set if previously null
                       if (!form.getValues('envelopeId') && envelopes.length > 0) {
                           // Optionally set a default envelope or leave it for user selection
                           // form.setValue('envelopeId', envelopes[0].id); 
                       }
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

        {/* isActualIncome Checkbox (conditional) */}
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

        {/* Account Select */}
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
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payee Select */}
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
                  {payees.map(payee => (
                    <SelectItem key={payee.id} value={payee.id}>
                      {payee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Envelope Select (conditional) */}
        {transactionType === 'outflow' && (
          <FormField
            control={form.control}
            name="envelopeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Envelope</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)} // Ensure null if empty
                  value={field.value ?? ""} // Allow empty string for placeholder, but onChange sends null
                  required={transactionType === 'outflow'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an envelope" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {envelopes.map(envelope => (
                        <SelectItem key={envelope.id} value={envelope.id}>
                          {envelope.name} ({envelope.category})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Amount Input */}
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

        {/* Description Input */}
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

        {/* Date Picker */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover> {/* Popover is now uncontrolled */}
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      type="button"
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
                      // console.log("[EditTF] Date selected from Calendar:", date);
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                      // Popover should close automatically with uncontrolled behavior
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
            (form.getValues('type') === 'outflow' && !!transaction.envelopeId && envelopes.length === 0 && !!form.getValues('envelopeId'))
          }
        >
          <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </form>
    </Form>
  );
}
