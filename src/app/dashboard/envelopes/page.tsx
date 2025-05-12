
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package } from "lucide-react"; // Using Package as a placeholder for envelope icon
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddEnvelopeForm } from "@/components/envelopes/add-envelope-form";
import EnvelopeSummaryList from "@/components/envelopes/envelope-summary-list"; // Reuse summary list for now
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";


export default function EnvelopesPage() {
  const [isAddEnvelopeDialogOpen, setIsAddEnvelopeDialogOpen] = useState(false);
  const { isLoading, envelopes } = useAppContext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Envelopes" description="Manage your budget categories." />
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
        title="Envelopes"
        description="Manage your budget categories (envelopes)."
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Envelopes</CardTitle>
          <CardDescription>View and manage your budget envelopes.</CardDescription>
        </CardHeader>
        <CardContent>
          {envelopes.length > 0 ? (
            <EnvelopeSummaryList /> // Reuse the summary list component for now
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed rounded-lg p-4">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No envelopes created yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add New Envelope" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
