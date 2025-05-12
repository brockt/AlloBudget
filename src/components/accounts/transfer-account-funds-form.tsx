
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { transferAccountFundsSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { TransferAccountFundsFormData } from "@/types";
import { ArrowRightLeft, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TransferAccountFundsFormProps {
  onSuccess?: () => void;
}

export function TransferAccountFundsForm({ onSuccess }: TransferAccountFundsFormProps) {
  const { accounts, transferBetweenAccounts, getAccountBalance } = useAppContext();
  const { toast } = useToast();
  const [sourceAccountBalance, setSourceAccountBalance] = useState<number | null>(null);

  const form = useForm<z.infer<typeof transferAccountFundsSchema>>({
    resolver: zodResolver(transferAccountFundsSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      description: "", // Default to empty string
    },
  });

  const fromAccountId = form.watch("fromAccountId");

  // Effect to update source account balance when selection changes
  useEffect(() => {
    if (fromAccountId) {
      const balance = getAccountBalance(fromAccountId);
      setSourceAccountBalance(balance);
      // Trigger amount validation if amount has a value
      if (form.getValues("amount") > 0) {
        form.trigger("amount");
      }
    } else {
      setSourceAccountBalance(null);
    }
  }, [fromAccountId, getAccountBalance, form]);

  // Custom validation rule for amount based on source account balance
  const refinedTransferSchema = transferAccountFundsSchema.refine(
    (data) => {
      if (fromAccountId && sourceAccountBalance !== null) {
        return data.amount <= sourceAccountBalance;
      }
      return true; // Pass if no source account or balance not yet calculated
    },
    {
      message: "Transfer amount cannot exceed the source account's balance.",
      path: ["amount"],
    }
  );

  // Re-initialize form with refined schema when balance updates
  useEffect(() => {
    const currentValues = form.getValues();
    form.reset(currentValues, {
      // @ts-ignore - Ignore TS error due to dynamic schema refinement
      resolver: zodResolver(refinedTransferSchema),
      keepValues: true, // Keep existing values
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceAccountBalance]); // Re-run only when sourceAccountBalance updates.

  function onSubmit(values: z.infer<typeof transferAccountFundsSchema>) {
    // Call the context function to handle the transfer and transaction creation
    transferBetweenAccounts(values as TransferAccountFundsFormData);
    const fromAccName = accounts.find(acc => acc.id === values.fromAccountId)?.name;
    const toAccName = accounts.find(acc => acc.id === values.toAccountId)?.name;
    toast({
      title: "Transfer Successful",
      description: `$${values.amount.toFixed(2)} transferred from "${fromAccName}" to "${toAccName}".`,
    });
    form.reset({
      fromAccountId: "",
      toAccountId: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
    });
    setSourceAccountBalance(null);
    if (onSuccess) onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fromAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.length === 0 && <SelectItem value="no-accounts-placeholder" disabled>No accounts available</SelectItem>}
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id} disabled={account.id === form.watch("toAccountId")}>
                      {account.name} (Balance: ${getAccountBalance(account.id).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceAccountBalance !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available balance: ${sourceAccountBalance.toFixed(2)}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.length === 0 && <SelectItem value="no-accounts-placeholder" disabled>No accounts available</SelectItem>}
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id} disabled={account.id === fromAccountId}>
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01"
                       onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                       value={field.value ?? 0}
                />
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
              <FormLabel>Transfer Date</FormLabel>
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
                      {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                {/* Always provide a string value to the input */}
                <Input placeholder="e.g., Move funds to savings" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full sm:w-auto" disabled={accounts.length < 2}>
          <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Funds
        </Button>
      </form>
    </Form>
  );
}
