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
import { PayeeList } from "@/components/payees/payee-list";
import { EditPayeeForm } from "@/components/payees/edit-payee-form"; // Import EditPayeeForm
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Payee } from "@/types"; // Import Payee type

export default function PayeesPage() {
  const [isAddPayeeDialogOpen, setIsAddPayeeDialogOpen] = useState(false);
  const [isEditPayeeDialogOpen, setIsEditPayeeDialogOpen] = useState(false); // State for edit dialog
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null); // State for payee being edited
  const { payees, isLoading } = useAppContext();

  const handleEditPayee = (payee: Payee) => {
    setEditingPayee(payee);
    setIsEditPayeeDialogOpen(true);
  };

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
    <div className="space-y-6 flex flex-col h-full"> {/* Changed: Added flex flex-col h-full */}
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

      {/* Changed: Added flex-grow flex flex-col overflow-hidden to Card */}
      <Card className="shadow-lg flex-grow flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>Payee List</CardTitle>
          <CardDescription>Your saved payees.</CardDescription>
        </CardHeader>
        {/* Changed: Added flex-grow overflow-hidden to CardContent. Adjusted padding. */}
        <CardContent className="pt-4 flex-grow overflow-hidden">
          {payees.length > 0 ? (
             <PayeeList onEditPayee={handleEditPayee} /> // Pass handleEditPayee to PayeeList
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-lg p-4 bg-muted/20"> {/* Changed: h-full */}
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Payees Yet</h3>
              <p className="text-muted-foreground mt-2">
                Click "Add New Payee" to add your first payee.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payee Dialog */}
      <Dialog open={isEditPayeeDialogOpen} onOpenChange={setIsEditPayeeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Payee</DialogTitle>
            <DialogDescription>
              Update the details for {editingPayee?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingPayee && (
              <EditPayeeForm
                payee={editingPayee}
                onSuccess={() => {
                  setIsEditPayeeDialogOpen(false);
                  setEditingPayee(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
