"use client";

import { useAppContext } from "@/context/AppContext";
import { AccountCard } from "./account-card";
import { Landmark } from "lucide-react";
import Image from "next/image";

export function AccountList() {
  const { accounts } = useAppContext();

  if (accounts.length === 0) {
    return (
      <div className="text-center py-10">
        <Landmark className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Accounts Yet</h3>
        <p className="text-muted-foreground">Add your bank accounts to start tracking your finances.</p>
         <Image 
            src="https://picsum.photos/seed/noaccounts/400/300" 
            alt="Illustration of an empty wallet or piggy bank" 
            width={300}
            height={225}
            className="mx-auto mt-6 rounded-lg shadow-md"
            data-ai-hint="empty wallet"
          />
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
