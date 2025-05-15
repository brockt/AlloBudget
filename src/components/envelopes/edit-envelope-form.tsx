
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
    // Default values will be set by useEffect below
    defaultValues: { // Provide defaults to ensure controlled state initially
        name: "",
        budgetAmount: 0,
        estimatedAmount: undefined,
        category: "",
        dueDate: undefined,
    }
  });

  // Pre-fill the form with the envelope data when the component mounts or envelope changes
  useEffect(() => {
    if (envelope) {
      form.reset({
        name: envelope.name,
        budgetAmount: typeof envelope.budgetAmount === 'number' && !isNaN(envelope.budgetAmount) ? envelope.budgetAmount : 0,
        estimatedAmount: envelope.estimatedAmount, 
        category: envelope.category,
        dueDate: envelope.dueDate,
      });
    }
  }, [envelope, form]);


  function onSubmit(values: z.infer<typeof envelopeSchema>) {
    const updatedEnvelopeData: Partial<Envelope> & { id: string } = {
      id: envelope.id, // Include the ID for the update function
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Budget Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} step="0.01" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} value={field.value ?? 0} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
                  // Always provide a string value to the input
                  value={field.value ?? ""}
                  onChange={e => {
                    const value = e.target.value;
                    const parsedValue = parseFloat(value);
                     // Set to undefined if empty or parsing fails (NaN)
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
              {/* Ensure value is always a string */}
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
                  // Always provide a string value to the input
                  value={field.value ?? ""}
                  onChange={e => {
                    const value = e.target.value;
                     // Set to undefined if empty or parsing fails (NaN)
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
