
"use client";

import type { Account } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Import Button
import { Landmark, DollarSign, CalendarDays, Pencil } from "lucide-react"; // Import Pencil
import { useAppContext } from "@/context/AppContext";
import { format, parseISO, isValid } from "date-fns";
import Link from "next/link";

interface AccountCardProps {
  account: Account;
  onEdit: () => void; // Callback for edit button
}

export function AccountCard({ account, onEdit }: AccountCardProps) {
  const { getAccountBalance } = useAppContext();
  const balance = getAccountBalance(account.id);

  const createdAtDate = parseISO(account.createdAt);
  const formattedDate = isValid(createdAtDate) ? format(createdAtDate, "MMM d, yyyy") : "Invalid Date";

  const handleEditClick = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent link navigation
    event.stopPropagation(); // Stop event from bubbling up to the Link
    onEdit();
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 h-full group relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10"
        onClick={handleEditClick}
        aria-label={`Edit ${account.name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Link href={`/dashboard/accounts/${account.id}/transactions`} passHref className="block h-full">
        <div className="cursor-pointer h-full flex flex-col"> {/* Ensure Link content fills card */}
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center pr-8"> {/* Add padding for button */}
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
                <CalendarDays className="mr-1 h-3 w-3" /> Created: {formattedDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-grow"> {/* Allow content to grow */}
            <div className="flex items-center text-xl font-semibold">
              <DollarSign className="mr-1 h-5 w-5 text-green-500" />
              Current Balance: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {/* Initial Balance Removed */}
            {/*
            <p className="text-sm text-muted-foreground">
              Initial Balance: ${account.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            */}
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}
