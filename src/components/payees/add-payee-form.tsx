
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
import { payeeSchema } from "@/lib/schemas";
import { useAppContext } from "@/context/AppContext";
import type { PayeeFormData } from "@/types";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddPayeeFormProps {
  onSuccess?: () => void;
}

export function AddPayeeForm({ onSuccess }: AddPayeeFormProps) {
  const { addPayee } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof payeeSchema>>({
    resolver: zodResolver(payeeSchema),
    defaultValues: {
      name: "",
      category: "", // Defaulting to "" makes it controlled
    },
  });

  function onSubmit(values: z.infer<typeof payeeSchema>) {
    // Filter out empty optional fields if necessary, or let the schema handle it
    const dataToAdd: PayeeFormData = {
        name: values.name,
        ...(values.category && { category: values.category }), // Only include category if provided
    }
    addPayee(dataToAdd);
    toast({
      title: "Payee Added",
      description: `Payee "${values.name}" has been successfully added.`,
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
                {/* Always provide a string value to the input */}
                <Input placeholder="e.g., Bills, Personal" {...field} value={field.value ?? ""} />
              </FormControl>
               <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Payee
        </Button>
      </form>
    </Form>
  );
}
