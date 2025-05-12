
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as z from "zod";
import { useEffect } from 'react';

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
import { accountSchema, accountTypes } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { Account, AccountFormData } from "@/types";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditAccountFormProps {
  account: Account;
  onSuccess?: () => void;
}

export function EditAccountForm({ account, onSuccess }: EditAccountFormProps) {
  const { updateAccount } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    // Default values will be set by useEffect below
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        initialBalance: account.initialBalance,
        type: account.type as typeof accountTypes[number] | undefined, // Cast to ensure compatibility
      });
    }
  }, [account, form]);

  function onSubmit(values: z.infer<typeof accountSchema>) {
    const updatedAccountData: Partial<AccountFormData> & { id: string } = {
      id: account.id, // Include the ID for the update function
      name: values.name,
      initialBalance: values.initialBalance,
      type: values.type,
    };
    updateAccount(updatedAccountData);
    toast({
      title: "Account Updated",
      description: `Account "${values.name}" has been successfully updated.`,
    });
    if (onSuccess) onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Checking Account" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initialBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Balance</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} value={field.value ?? 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto">
          <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </form>
    </Form>
  );
}
