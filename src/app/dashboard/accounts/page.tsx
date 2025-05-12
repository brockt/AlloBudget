
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddAccountForm } from "@/components/accounts/add-account-form";
import { EditAccountForm } from "@/components/accounts/edit-account-form"; // Import EditAccountForm
import { TransferAccountFundsForm } from "@/components/accounts/transfer-account-funds-form"; // Import Transfer form
import { AccountList } from "@/components/accounts/account-list";
import { PageHeader } from "@/components/PageHeader";
import { PlusCircle, ArrowRightLeft } from "lucide-react"; // Added ArrowRightLeft
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
import type { Account } from "@/types"; // Import Account type

export default function AccountsPage() {
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [isTransferFundsDialogOpen, setIsTransferFundsDialogOpen] = useState(false); // State for transfer dialog
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { isLoading, accounts } = useAppContext(); // Get accounts for disabling button

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsEditAccountDialogOpen(true);
  };

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
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Add Account Dialog */}
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

            {/* Transfer Funds Dialog */}
            <Dialog open={isTransferFundsDialogOpen} onOpenChange={setIsTransferFundsDialogOpen}>
                <DialogTrigger asChild>
                <Button variant="outline" disabled={accounts.length < 2}> {/* Disable if less than 2 accounts */}
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Funds
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Transfer Funds Between Accounts</DialogTitle>
                    <DialogDescription>
                    Move money from one account to another. This will create two transactions.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <TransferAccountFundsForm onSuccess={() => setIsTransferFundsDialogOpen(false)} />
                </div>
                </DialogContent>
            </Dialog>
          </div>
        }
      />
      <AccountList onEditAccount={handleEditAccount} /> {/* Pass handleEditAccount to AccountList */}

      {/* Edit Account Dialog */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the details for {editingAccount?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingAccount && (
              <EditAccountForm
                account={editingAccount}
                onSuccess={() => {
                  setIsEditAccountDialogOpen(false);
                  setEditingAccount(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
