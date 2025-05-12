
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
import { payeeSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { Payee, PayeeWithId } from "@/types"; // Import Payee and PayeeWithId
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditPayeeFormProps {
  payee: Payee;
  onSuccess?: () => void;
}

export function EditPayeeForm({ payee, onSuccess }: EditPayeeFormProps) {
  const { updatePayee } = useAppContext(); // Use updatePayee from context
  const { toast } = useToast();

  const form = useForm<z.infer<typeof payeeSchema>>({
    resolver: zodResolver(payeeSchema),
    // Default values will be set by useEffect below
  });

  // Pre-fill the form with the payee data when the component mounts or payee changes
  useEffect(() => {
    if (payee) {
      form.reset({
        name: payee.name,
        category: payee.category || "", // Ensure category is an empty string if undefined
      });
    }
  }, [payee, form]);

  function onSubmit(values: z.infer<typeof payeeSchema>) {
    const updatedPayeeData: PayeeWithId = {
      id: payee.id, // Include the ID for the update function
      name: values.name,
      ...(values.category && { category: values.category }), // Only include category if provided
    };
    updatePayee(updatedPayeeData);
    toast({
      title: "Payee Updated",
      description: `Payee "${values.name}" has been successfully updated.`,
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
              <FormLabel>Payee Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe, Utility Company" {...field} />
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
                {/* Provide an empty string if value is null/undefined */}
                <Input placeholder="e.g., Bills, Personal" {...field} value={field.value ?? ""} />
              </FormControl>
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
