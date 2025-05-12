

"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as z from "zod";
import { format, parseISO } from "date-fns"; // Import parseISO

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
import { transactionSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { TransactionFormData, TransactionType } from "@/types";
import { PlusCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; // For redirecting after add


interface AddTransactionFormProps {
  defaultAccountId?: string;
  onSuccess?: () => void;
  navigateToTransactions?: boolean; // If true, navigates to /transactions on success
}

export function AddTransactionForm({ defaultAccountId, onSuccess, navigateToTransactions = false }: AddTransactionFormProps) {
  const { accounts, envelopes, payees, addTransaction } = useAppContext(); // Added payees
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: defaultAccountId || (accounts.length > 0 ? accounts[0].id : ""),
      envelopeId: null, // Default to null instead of ""
      payeeId: "", // Default payee to empty string (as it's required now)
      amount: 0,
      type: "expense",
      description: "", // Empty string is a valid optional value
      date: format(new Date(), "yyyy-MM-dd"), // Default to today's date string
    },
  });

  const transactionType = form.watch("type");

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    // Ensure the date string is valid before passing to context
    const transactionDataWithParsedDate: TransactionFormData = {
        ...values,
        description: values.description || undefined, 
        payeeId: values.payeeId,
        // If type is income, ensure envelopeId is null/undefined, otherwise use value from form
        envelopeId: values.type === 'income' ? null : values.envelopeId, 
        date: values.date 
    }
    addTransaction(transactionDataWithParsedDate);
    toast({
      title: "Transaction Added",
      description: `Transaction for $${values.amount} has been successfully added.`,
    });
    form.reset({
        accountId: form.getValues('accountId'), 
        amount: 0,
        description: "", 
        type: form.getValues('type'), 
        envelopeId: form.getValues('type') === 'income' ? null : (envelopes.length > 0 && form.getValues('type') === 'expense' ? form.getValues('envelopeId') : null), // Reset or keep envelope based on type and availability
        payeeId: "", 
        date: format(new Date(), "yyyy-MM-dd")
    });
    if (onSuccess) onSuccess();
    if (navigateToTransactions) router.push("/dashboard/transactions");
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
                    if (value === 'income') {
                      form.setValue('envelopeId', null); 
                    } else {
                        // If switching to expense and no envelope is selected, or no envelopes exist,
                        // RHF will use the default (null) or current value. Zod validation will catch it.
                    }
                  }}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal">Expense</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal">Income</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} required>
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

        {transactionType === 'expense' && (
          <FormField
            control={form.control}
            name="envelopeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Envelope</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)} 
                  value={field.value ?? ""} 
                  required // Mark as required for expense
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an envelope" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {envelopes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">No envelopes available.</div>
                     ) : (
                        envelopes.map(envelope => (
                          <SelectItem key={envelope.id} value={envelope.id}>
                            {envelope.name}
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
            payees.length === 0 || 
            accounts.length === 0 ||
            (form.getValues('type') === 'expense' && envelopes.length === 0)
          }
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </form>
    </Form>
  );
}

