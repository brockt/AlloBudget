
"use client";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react"; // Using Users icon for payees

export default function PayeesPage() {
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
        // actions={<Button><PlusCircle className="mr-2 h-4 w-4" /> Add Payee</Button>} // Add button in future
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Payee List</CardTitle>
          <CardDescription>Your saved payees will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg p-4 bg-muted/20">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Payee Management Coming Soon!</h3>
            <p className="text-muted-foreground mt-2">
              You'll soon be able to add, edit, and manage your payees here to streamline transaction entries.
            </p>
          </div>
          {/* Placeholder for future Payee list/table */}
        </CardContent>
      </Card>
    </div>
  );
}
