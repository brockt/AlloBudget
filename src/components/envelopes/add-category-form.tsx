
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { useAppContext } from "@/context/AppContext"; // Import if adding categories to context

// Schema for the category form
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required.").max(100, "Name too long."),
});

interface AddCategoryFormProps {
  onSuccess?: () => void;
}

export function AddCategoryForm({ onSuccess }: AddCategoryFormProps) {
  // const { addCategory } = useAppContext(); // Uncomment if implementing category context
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: z.infer<typeof categorySchema>) {
    // ** Placeholder for saving the category **
    // Currently, categories are just strings on envelopes.
    // To have a managed list of categories, you'd need to:
    // 1. Add `categories: string[]` state to AppContext.
    // 2. Add an `addCategory(categoryName: string)` function to AppContext.
    // 3. Update localStorage persistence in AppContext.
    // 4. Call `addCategory(values.name)` here.

    console.log("Category to add (not implemented yet):", values.name); // Log for now
    toast({
      title: "Category Added (Simulated)",
      description: `Category group "${values.name}" would be added here.`,
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
              <FormLabel>Category Group Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Housing, Utilities, Fun" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Category Group
        </Button>
      </form>
    </Form>
  );
}
