
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
import { useAppContext } from "@/context/AppContext"; // Import context

// Schema for the category form
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required.").max(100, "Name too long."),
});

interface AddCategoryFormProps {
  onSuccess?: () => void;
}

export function AddCategoryForm({ onSuccess }: AddCategoryFormProps) {
  const { addCategory, categories } = useAppContext(); // Get addCategory function and categories
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: z.infer<typeof categorySchema>) {
    const categoryName = values.name.trim(); // Trim whitespace
    
    // Check for duplicates (case-insensitive) before adding
    if (categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
        toast({
            title: "Category Exists",
            description: `The category group "${categoryName}" already exists.`,
            variant: "destructive"
        });
    } else {
        addCategory(categoryName); // Call the context function
        toast({
          title: "Category Group Added",
          description: `Category group "${categoryName}" has been successfully added.`,
        });
        form.reset();
        if (onSuccess) onSuccess();
    }
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
