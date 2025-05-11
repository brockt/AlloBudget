
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddAccountForm } from "@/components/accounts/add-account-form";
import { AccountList } from "@/components/accounts/account-list";
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

export default function AccountsPage() {
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const { isLoading } = useAppContext();
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Accounts" description="Manage your bank accounts."/>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your bank accounts and their balances."
        actions={
          <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
                <DialogDescription>
                  Enter the details for your new bank account.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AddAccountForm onSuccess={() => setIsAddAccountDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <AccountList />
    </div>
  );
}
