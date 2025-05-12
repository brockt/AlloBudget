
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
import { transferEnvelopeFundsSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { TransferEnvelopeFundsFormData } from "@/types";
import { ArrowRightLeft, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TransferFundsFormProps {
  onSuccess?: () => void;
}

export function TransferFundsForm({ onSuccess }: TransferFundsFormProps) {
  const { accounts, envelopes, transferBetweenEnvelopes, getEnvelopeBalanceWithRollover } = useAppContext();
  const { toast } = useToast();
  const [sourceEnvelopeBalance, setSourceEnvelopeBalance] = useState<number | null>(null);

  const form = useForm<z.infer<typeof transferEnvelopeFundsSchema>>({
    resolver: zodResolver(transferEnvelopeFundsSchema),
    defaultValues: {
      fromEnvelopeId: "",
      toEnvelopeId: "",
      amount: 0,
      accountId: accounts.length > 0 ? accounts[0].id : "",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  });

  const fromEnvelopeId = form.watch("fromEnvelopeId");

  useEffect(() => {
    if (fromEnvelopeId) {
      const balance = getEnvelopeBalanceWithRollover(fromEnvelopeId);
      setSourceEnvelopeBalance(balance);
      // Trigger validation for amount if fromEnvelopeId changes and amount has a value
      if (form.getValues("amount") > 0) {
        form.trigger("amount");
      }
    } else {
      setSourceEnvelopeBalance(null);
    }
  }, [fromEnvelopeId, getEnvelopeBalanceWithRollover, form]);

  // Custom validation rule for amount based on source envelope balance
  const refinedTransferSchema = transferEnvelopeFundsSchema.refine(
    (data) => {
      if (fromEnvelopeId && sourceEnvelopeBalance !== null) {
        return data.amount <= sourceEnvelopeBalance;
      }
      return true; // Pass if no source envelope or balance not yet calculated
    },
    {
      message: "Transfer amount cannot exceed the source envelope's available balance.",
      path: ["amount"],
    }
  );
  
  // Re-initialize form with refined schema
   useEffect(() => {
    form.reset(form.getValues(), {
      // @ts-ignore
      resolver: zodResolver(refinedTransferSchema), // Temporarily ignore TS error due to dynamic schema
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceEnvelopeBalance]); // Re-run when sourceEnvelopeBalance updates. form not needed in deps.


  function onSubmit(values: z.infer<typeof transferEnvelopeFundsSchema>) {
    transferBetweenEnvelopes(values as TransferEnvelopeFundsFormData);
    const fromEnvName = envelopes.find(e => e.id === values.fromEnvelopeId)?.name;
    const toEnvName = envelopes.find(e => e.id === values.toEnvelopeId)?.name;
    toast({
      title: "Transfer Successful",
      description: `$${values.amount.toFixed(2)} transferred from "${fromEnvName}" to "${toEnvName}".`,
    });
    form.reset({
      fromEnvelopeId: "",
      toEnvelopeId: "",
      amount: 0,
      accountId: accounts.length > 0 ? accounts[0].id : "",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
    });
    setSourceEnvelopeBalance(null);
    if (onSuccess) onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fromEnvelopeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Envelope</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source envelope" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {envelopes.length === 0 && <SelectItem value="" disabled>No envelopes available</SelectItem>}
                  {envelopes.map(envelope => (
                    <SelectItem key={envelope.id} value={envelope.id} disabled={envelope.id === form.watch("toEnvelopeId")}>
                      {envelope.name} (Balance: ${getEnvelopeBalanceWithRollover(envelope.id).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceEnvelopeBalance !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available to transfer: ${sourceEnvelopeBalance.toFixed(2)}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toEnvelopeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Envelope</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination envelope" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {envelopes.length === 0 && <SelectItem value="" disabled>No envelopes available</SelectItem>}
                  {envelopes.map(envelope => (
                    <SelectItem key={envelope.id} value={envelope.id} disabled={envelope.id === fromEnvelopeId}>
                      {envelope.name}
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
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account for Transactions</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.length === 0 && <SelectItem value="" disabled>No accounts available</SelectItem>}
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
                <Input placeholder="e.g., Move funds for vacation" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full sm:w-auto" disabled={envelopes.length < 2 || accounts.length === 0}>
          <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Funds
        </Button>
      </form>
    </Form>
  );
}
