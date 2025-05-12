
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddPayeeForm } from "@/components/payees/add-payee-form"; // Placeholder form

export default function PayeesPage() {
  const [isAddPayeeDialogOpen, setIsAddPayeeDialogOpen] = useState(false);
  // Future state and logic for payees will go here
  const isLoading = false; // Placeholder

  if (isLoading) {
    // Add skeleton loading state if needed in the future
    return <div>Loading Payees...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payees"
        description="Manage your frequent payees and contacts."
        actions={
          <Dialog open={isAddPayeeDialogOpen} onOpenChange={setIsAddPayeeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Payee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Payee</DialogTitle>
                <DialogDescription>
                  Enter the details for the new payee.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AddPayeeForm onSuccess={() => setIsAddPayeeDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Payee List</CardTitle>
          <CardDescription>Your saved payees will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg p-4 bg-muted/20">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Payees Yet</h3>
            <p className="text-muted-foreground mt-2">
              Click "Add New Payee" to add your first payee.
            </p>
          </div>
          {/* Placeholder for future Payee list/table */}
        </CardContent>
      </Card>
    </div>
  );
}
