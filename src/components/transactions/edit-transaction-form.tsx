
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Keep z import for infer
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

interface EditTransactionFormProps {
  transaction: Transaction;
  onSuccess?: () => void;
}

export function EditTransactionForm({ transaction, onSuccess }: EditTransactionFormProps) {
  const { accounts, envelopes, payees, updateTransaction, isLoading: isAppContextLoading } = useAppContext();
  const { toast } = useToast();
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    // Default values are minimal here; useEffect with setValue will handle detailed initialization
    defaultValues: {
      type: "outflow",
      amount: 0,
      isTransfer: false,
      isActualIncome: false,
      date: format(new Date(), "yyyy-MM-dd"), // Default to today if transaction.date is problematic
    },
  });

  useEffect(() => {
    if (transaction && !isAppContextLoading && accounts.length > 0 && payees.length > 0) {
      const outflowRequiresEnvelope = transaction.type === 'outflow' && transaction.envelopeId;
      if (outflowRequiresEnvelope && envelopes.length === 0 && transaction.envelopeId) {
        return; 
      }

      // Explicitly set values using form.setValue
      form.setValue('accountId', transaction.accountId || '', { shouldDirty: false });
      form.setValue('payeeId', transaction.payeeId || '', { shouldDirty: false });
      form.setValue('envelopeId', transaction.envelopeId || null, { shouldDirty: false });
      form.setValue('amount', transaction.amount, { shouldDirty: false });
      form.setValue('type', transaction.type, { shouldDirty: false });
      form.setValue('description', transaction.description || '', { shouldDirty: false });

      const parsedDate = transaction.date ? parseISO(transaction.date) : null;
      const initialDateString = parsedDate && isValidDate(parsedDate) ? format(parsedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      form.setValue('date', initialDateString, { shouldDirty: false });

      form.setValue('isTransfer', transaction.isTransfer || false, { shouldDirty: false });
      form.setValue('isActualIncome', transaction.isActualIncome || false, { shouldDirty: false });
    }
  }, [transaction, form, accounts, payees, envelopes, isAppContextLoading]);

  const transactionType = form.watch("type");

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    const updatedTransactionData: TransactionWithId = {
      id: transaction.id,
      ...values,
      description: values.description || undefined,
      envelopeId: values.type === 'inflow' ? null : values.envelopeId, // Ensure envelopeId is null for inflow
      isTransfer: values.isTransfer || false,
      isActualIncome: values.type === 'inflow' ? (values.isActualIncome || false) : false,
    };
    updateTransaction(updatedTransactionData);
    toast({
      title: "Transaction Updated",
      description: `Transaction has been successfully updated.`,
    });
    if (onSuccess) onSuccess();
  }

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
                      form.setValue('envelopeId', null); // Clear envelope if type changes to inflow
                    } else {
                       form.setValue('isActualIncome', false); // Reset if switching to outflow
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
            render={({ field }) => ( // field.value here can be string or null
              <FormItem>
                <FormLabel>Envelope</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)} // Ensure null if empty
                  value={field.value ?? ""} // Handle null for Select value
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
                      onClick={() => setIsDatePopoverOpen(true)}
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
          disabled={ // Disable if context is loading or essential lists are empty
            isAppContextLoading || 
            payees.length === 0 ||
            accounts.length === 0 ||
            (form.getValues('type') === 'outflow' && envelopes.length === 0 && !!transaction.envelopeId) 
          }
        >
          <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </form>
    </Form>
  );
}
    

    