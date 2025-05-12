
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package } from "lucide-react"; // Keep Package for Add Envelope
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddEnvelopeForm } from "@/components/envelopes/add-envelope-form";
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";


export default function EnvelopesPage() {
  const [isAddEnvelopeDialogOpen, setIsAddEnvelopeDialogOpen] = useState(false);
  // const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false); // State for new dialog
  const { isLoading, envelopes } = useAppContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Envelopes" description="Manage your budget categories." />
        <Card>
          <CardContent className="pt-6"> {/* Ensure CardContent is used if CardHeader is removed */}
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
        title="Envelopes"
        description="Manage your budget categories (envelopes), grouped by category."
        actions={<div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isAddEnvelopeDialogOpen} onOpenChange={setIsAddEnvelopeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                 <Package className="mr-2 h-4 w-4" /> {/* Changed Icon */} Add Envelope
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              {/* Ensure DialogHeader and DialogTitle are present */}
              <DialogHeader>
                <DialogTitle>Add New Envelope</DialogTitle>
                <DialogDescription>
                  Define a new budget category (envelope) and optionally assign it to a group.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AddEnvelopeForm onSuccess={() => setIsAddEnvelopeDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
          {/* Placeholder Button for Add Category - Needs Dialog Implementation */}
          <Button variant="outline" onClick={() => alert('Add Category functionality not implemented yet.')} >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category Group
          </Button>
          {/* Add Dialog for Category - Example Structure
          <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
            <DialogTrigger asChild>
               <Button variant="outline">
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Category
               </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Category Group</DialogTitle>
                <DialogDescription>
                  Enter the name for the new category group.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                 {/* Add Category Form Component Here }
              </div>
            </DialogContent>
          </Dialog>
           */}
        </div>}
      />

      {/* Use Card for consistency */}
      <Card className="shadow-lg">
        <CardContent className="pt-4"> {/* Add some padding */}
          {envelopes.length > 0 ? (
            <EnvelopeSummaryList /> // Use the updated list component
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed rounded-lg p-4">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No envelopes created yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Envelope" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
