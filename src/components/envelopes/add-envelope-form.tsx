
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as z from "zod";

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
import { envelopeSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { EnvelopeFormData } from "@/types";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddEnvelopeFormProps {
  onSuccess?: () => void;
}

export function AddEnvelopeForm({ onSuccess }: AddEnvelopeFormProps) {
  const { addEnvelope } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof envelopeSchema>>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      name: "",
      budgetAmount: 0,
      category: "", // Default empty category
    },
  });

  function onSubmit(values: z.infer<typeof envelopeSchema>) {
    const dataToAdd: EnvelopeFormData = {
      name: values.name,
      budgetAmount: values.budgetAmount,
      ...(values.category && { category: values.category }), // Only include category if provided
    };
    addEnvelope(dataToAdd);
    toast({
      title: "Envelope Added",
      description: `Envelope "${values.name}" has been successfully added.`,
    });
    form.reset();
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
              <FormLabel>Envelope Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries, Rent" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="budgetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Budget Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Housing, Food, Fun Money" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Envelope
        </Button>
      </form>
    </Form>
  );
}

```