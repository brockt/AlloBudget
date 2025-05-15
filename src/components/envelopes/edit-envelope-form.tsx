
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { envelopeSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { Envelope } from "@/types";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditEnvelopeFormProps {
  envelope: Envelope;
  onSuccess?: () => void;
}

export function EditEnvelopeForm({ envelope, onSuccess }: EditEnvelopeFormProps) {
  const { updateEnvelope, categories } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof envelopeSchema>>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
        name: "",
        budgetAmount: 0, // Default to 0
        estimatedAmount: undefined,
        category: "",
        dueDate: undefined,
    }
  });

  useEffect(() => {
    // Log the envelope prop when the component mounts or the envelope prop changes
    console.log("[EditEnvelopeForm] Envelope prop received:", JSON.stringify(envelope));
    if (envelope) {
      let initialBudgetAmount = 0;
      if (typeof envelope.budgetAmount === 'number' && !isNaN(envelope.budgetAmount)) {
        initialBudgetAmount = envelope.budgetAmount;
      }
      console.log("[EditEnvelopeForm] Initializing form with budgetAmount:", initialBudgetAmount);
      form.reset({
        name: envelope.name,
        budgetAmount: initialBudgetAmount,
        estimatedAmount: envelope.estimatedAmount,
        category: envelope.category,
        dueDate: envelope.dueDate,
      });
    }
  }, [envelope, form]);


  function onSubmit(values: z.infer<typeof envelopeSchema>) {
    console.log("[EditEnvelopeForm] Submitting values:", JSON.stringify(values));
    const updatedEnvelopeData: Partial<Envelope> & { id: string } = {
      id: envelope.id,
      name: values.name,
      budgetAmount: values.budgetAmount,
      estimatedAmount: values.estimatedAmount,
      category: values.category,
      dueDate: values.dueDate,
    };
    updateEnvelope(updatedEnvelopeData);
    toast({
      title: "Envelope Updated",
      description: `Envelope "${values.name}" has been successfully updated.`,
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
          render={({ field }) => {
            // Log the field value for budgetAmount whenever it renders
            console.log("[EditEnvelopeForm] budgetAmount field.value:", field.value);
            return (
              <FormItem>
                <FormLabel>Monthly Budget Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    step="0.01"
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      field.onChange(isNaN(val) ? 0 : val); // Ensure it's always a number, default to 0
                    }}
                    value={field.value ?? 0} // Ensure input value is always a number
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
         <FormField
          control={form.control}
          name="estimatedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Amount (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 150.00"
                  {...field}
                  step="0.01"
                  value={field.value ?? ""}
                  onChange={e => {
                    const value = e.target.value;
                    const parsedValue = parseFloat(value);
                    field.onChange(value === "" || isNaN(parsedValue) ? undefined : parsedValue);
                  }}
                />
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
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} required>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                      No categories created yet.
                    </div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
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
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Day (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Day of month (1-31)"
                  {...field}
                  min="1"
                  max="31"
                  value={field.value ?? ""}
                  onChange={e => {
                    const value = e.target.value;
                    field.onChange(value === "" ? undefined : parseInt(value, 10) || undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={categories.length === 0}>
          <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </form>
    </Form>
  );
}
