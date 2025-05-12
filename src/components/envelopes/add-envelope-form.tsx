
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { envelopeSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { EnvelopeFormData } from "@/types";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddEnvelopeFormProps {
  onSuccess?: () => void;
}

export function AddEnvelopeForm({ onSuccess }: AddEnvelopeFormProps) {
  const { addEnvelope, categories } = useAppContext(); // Get categories from context
  const { toast } = useToast();

  // No need to derive categories from envelopes anymore

  const form = useForm<z.infer<typeof envelopeSchema>>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      name: "",
      budgetAmount: 0,
      category: "", // Default to empty string, user must select
      dueDate: undefined, // Default due date to undefined
    },
  });

  function onSubmit(values: z.infer<typeof envelopeSchema>) {
    // Category is now guaranteed by the schema
    const dataToAdd: EnvelopeFormData = {
      name: values.name,
      budgetAmount: values.budgetAmount,
      category: values.category,
      dueDate: values.dueDate, // Add dueDate
    };
    addEnvelope(dataToAdd);
    toast({
      title: "Envelope Added",
      description: `Envelope "${values.name}" has been successfully added to category "${values.category}".`,
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
                <Input type="number" placeholder="0.00" {...field} step="0.01" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} value={field.value ?? 0} />
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
              <Select onValueChange={field.onChange} value={field.value || ""} required> {/* Mark as required, ensure value is not undefined */}
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.length === 0 ? (
                    // Display a message instead of a SelectItem with empty value
                    <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                      No categories created yet.<br/> Use 'Add Category Group' first.
                    </div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))
                  )}
                  {/* Maybe add an option here to trigger the Add Category dialog? */}
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
                {/* Use Input type="number" for due date */}
                <Input
                  type="number"
                  placeholder="Day of month (1-31)"
                  {...field}
                  min="1"
                  max="31"
                  // Handle potential undefined value on reset
                  value={field.value ?? ""}
                  onChange={e => {
                    const value = e.target.value;
                    // Allow empty string for optional field, otherwise parse as number
                    field.onChange(value === "" ? undefined : parseInt(value, 10) || undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={categories.length === 0}>
           {/* Disable submit if no categories exist, as category is mandatory */}
          <PlusCircle className="mr-2 h-4 w-4" /> Add Envelope
        </Button>
      </form>
    </Form>
  );
}
