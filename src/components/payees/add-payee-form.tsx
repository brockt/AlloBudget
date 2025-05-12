
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

interface AddPayeeFormProps {
  onSuccess?: () => void;
}

// This is a placeholder form. In a real scenario, you'd use react-hook-form and Zod for validation.
export function AddPayeeForm({ onSuccess }: AddPayeeFormProps) {
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Placeholder for actual form submission logic
    const formData = new FormData(event.currentTarget);
    const payeeName = formData.get("payeeName") as string;

    console.log("Adding payee:", payeeName);
    toast({
      title: "Payee Added (Placeholder)",
      description: `Payee "${payeeName}" would be added. This is a demo.`,
    });
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="payeeName">Payee Name</Label>
        <Input id="payeeName" name="payeeName" placeholder="e.g., John Doe, Utility Company" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="payeeCategory">Category (Optional)</Label>
        <Input id="payeeCategory" name="payeeCategory" placeholder="e.g., Bills, Personal" />
      </div>
      <p className="text-sm text-muted-foreground">
        More fields (contact info, default envelope, etc.) will be available in a future update.
      </p>
      <Button type="submit" className="w-full sm:w-auto">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Payee
      </Button>
    </form>
  );
}
