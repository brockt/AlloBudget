"use client";

import type { Account } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Landmark, DollarSign, CalendarDays } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { format } from "date-fns";

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const { getAccountBalance } = useAppContext();
  const balance = getAccountBalance(account.id);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Landmark className="mr-2 h-5 w-5 text-primary" />
            {account.name}
          </CardTitle>
          {account.type && (
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
              {account.type}
            </span>
          )}
        </div>
        <CardDescription className="flex items-center text-xs pt-1">
           <CalendarDays className="mr-1 h-3 w-3" /> Created: {format(new Date(account.createdAt), "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-xl font-semibold">
          <DollarSign className="mr-1 h-5 w-5 text-green-500" />
          Current Balance: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-sm text-muted-foreground">
          Initial Balance: ${account.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </CardContent>
    </Card>
  );
}
