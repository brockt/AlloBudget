
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package } from "lucide-react";
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
        description="Manage your budget categories (envelopes), grouped by category."
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
                  Define a new category for your budget and assign it to a category.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AddEnvelopeForm onSuccess={() => setIsAddEnvelopeDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Use Card for consistency, but remove internal header/description as grouping handles it */}
      <Card className="shadow-lg">
        <CardContent className="pt-4"> {/* Add some padding */}
          {envelopes.length > 0 ? (
            <EnvelopeSummaryList /> // Use the updated list component
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

```