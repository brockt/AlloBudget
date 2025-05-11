
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddEnvelopeForm } from "@/components/envelopes/add-envelope-form";
import { EnvelopeList } from "@/components/envelopes/envelope-list";
import { PageHeader } from "@/components/PageHeader";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";


export default function EnvelopesPage() {
  const [isAddEnvelopeDialogOpen, setIsAddEnvelopeDialogOpen] = useState(false);
  const { isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Envelopes" description="Manage your spending categories." />
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Envelopes"
        description="Categorize your spending and set monthly budgets."
        actions={
          <Dialog open={isAddEnvelopeDialogOpen} onOpenChange={setIsAddEnvelopeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Envelope
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Envelope</DialogTitle>
                <DialogDescription>
                  Define a new category for your budget.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AddEnvelopeForm onSuccess={() => setIsAddEnvelopeDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <EnvelopeList />
    </div>
  );
}
