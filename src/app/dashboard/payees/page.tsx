
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
import { AddPayeeForm } from "@/components/payees/add-payee-form";
import { PayeeList } from "@/components/payees/payee-list"; // Import the new list component
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayeesPage() {
  const [isAddPayeeDialogOpen, setIsAddPayeeDialogOpen] = useState(false);
  const { payees, isLoading } = useAppContext(); // Get payees and loading state

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payees" description="Manage your frequent payees and contacts."/>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-1/3 mb-2" />
             <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
              {/* Ensure DialogHeader and DialogTitle are present */}
              <DialogHeader>
                <DialogTitle>Add New Payee</DialogTitle>
                <DialogDescription>
                  Enter the details for the new payee. Optionally assign a category.
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
          <CardDescription>Your saved payees.</CardDescription>
        </CardHeader>
        <CardContent>
          {payees.length > 0 ? (
             <PayeeList /> // Display the list component
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg p-4 bg-muted/20">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Payees Yet</h3>
              <p className="text-muted-foreground mt-2">
                Click "Add New Payee" to add your first payee.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
