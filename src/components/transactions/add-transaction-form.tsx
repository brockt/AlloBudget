"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as z from "zod";
import { format, parseISO } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { transactionSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { TransactionFormData, TransactionType } from "@/types";
import { PlusCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

interface AddTransactionFormProps {
  onSuccess?: () => void;
  navigateToTransactions?: boolean;
}

export function AddTransactionForm({ onSuccess, navigateToTransactions = false }: AddTransactionFormProps) {
  const { accounts, envelopes, payees, addTransaction, isLoading: isAppContextLoading } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialAccountId, setInitialAccountId] = useState<string | undefined>(undefined);
  const [formReady, setFormReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  useEffect(() => {
    if (!isAppContextLoading) { 
      const accountIdFromQuery = searchParams.get('accountId');
      if (accountIdFromQuery && accounts.some(acc => acc.id === accountIdFromQuery)) {
        setInitialAccountId(accountIdFromQuery);
      } else if (accounts.length > 0) {
        setInitialAccountId(accounts[0].id);
      } else {
        setInitialAccountId(""); 
      }
      setFormReady(true); 
    }
  }, [isAppContextLoading, searchParams, accounts]);


  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
  });

  useEffect(() => {
    if (formReady) {
      form.reset({
        accountId: initialAccountId || (accounts.length > 0 ? accounts[0].id : ""),
        envelopeId: null,
        payeeId: payees.length > 0 ? payees[0].id : "", 
        amount: 0,
        type: "outflow", // Default to outflow
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        isTransfer: false,
        isActualIncome: false, // Default isActualIncome
      });
    }
  }, [formReady, initialAccountId, form, accounts, payees]);


  const transactionType = form.watch("type");

  async function onSubmit(values: z.infer<typeof transactionSchema>) {
    setIsSubmitting(true);
    const transactionDataWithParsedDate: TransactionFormData = {
        ...values,
        description: values.description || undefined,
        payeeId: values.payeeId,
        envelopeId: values.type === 'inflow' && values.isActualIncome ? null : values.envelopeId,
        date: values.date,
        isTransfer: values.isTransfer || false,
        isActualIncome: values.type === 'inflow' ? (values.isActualIncome || false) : false,
    };

    try {
        await addTransaction(transactionDataWithParsedDate);
        toast({
          title: "Transaction Added",
          description: `Transaction for $${values.amount.toFixed(2)} has been successfully added.`,
        });

        let resetAccountId = form.getValues('accountId');
        if (navigateToTransactions) {
            const queryAccountId = searchParams.get('accountId');
            if (!queryAccountId) {
                 resetAccountId = accounts.length > 0 ? accounts[0].id : "";
            } else {
                resetAccountId = initialAccountId || (accounts.length > 0 ? accounts[0].id : "");
            }
        }

        form.reset({
            accountId: resetAccountId,
            amount: 0,
            description: "",
            type: form.getValues('type'),
            envelopeId: form.getValues('type') === 'inflow' && form.getValues('isActualIncome') 
              ? null 
              : (envelopes.length > 0 ? form.getValues('envelopeId') : null),
            payeeId: payees.length > 0 ? payees[0].id : "", 
            date: format(new Date(), "yyyy-MM-dd"),
            isTransfer: false,
            isActualIncome: false,
        });

        if (onSuccess) onSuccess();

        if (navigateToTransactions) {
            const accountIdFromQuery = searchParams.get('accountId'); 
            if (accountIdFromQuery) {
                router.push(`/dashboard/accounts/${accountIdFromQuery}/transactions`);
            } else {
                router.push("/dashboard/transactions");
            }
        }
    } catch (error) {
        console.error("Failed to add transaction:", error);
        toast({
            title: "Error Adding Transaction",
            description: (error as Error)?.message || "Could not add transaction. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (!formReady) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
        <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
        <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
        <div className="h-10 w-1/2 bg-muted rounded-md animate-pulse"></div>
      </div>
    );
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
                      form.setValue('isActualIncome', false); // Reset isActualIncome when changing type
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
                  {accounts.length === 0 && <SelectItem value="no-accounts-placeholder" disabled>No accounts available</SelectItem>}
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

        <FormField
          control={form.control}
          name="payeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payee</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
                required
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {payees.length === 0 && <SelectItem value="no-payees-placeholder" disabled>No payees available</SelectItem>}
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

        {(transactionType === 'outflow' || (transactionType === 'inflow' && !form.watch('isActualIncome'))) && (
          <FormField
            control={form.control}
            name="envelopeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Envelope</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)}
                  value={field.value ?? ""}
                  required
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an envelope" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {envelopes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                            No envelopes available.<br/> Add one on the Dashboard first.
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
                <Input type="number" placeholder="0.00" {...field} step="0.01" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} value={field.value ?? 0} />
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
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
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
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    initialFocus
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
            isSubmitting || 
            payees.length === 0 ||
            accounts.length === 0 ||
            (form.getValues('type') === 'outflow' && envelopes.length === 0)
          }
        >
          <PlusCircle className="mr-2 h-4 w-4" /> {isSubmitting ? "Adding..." : "Add Transaction"}
        </Button>
      </form>
    </Form>
  );
}
