
"use client";

import { useAppContext } from "@/context/AppContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card"; // Use Card for consistent styling
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns"; // Import parseISO and isValid
import Link from "next/link"; // Import Link

export function PayeeList() {
  const { payees } = useAppContext();

  if (payees.length === 0) {
    // This case should ideally be handled by the parent component (PayeesPage)
    return null;
  }

  return (
    <ScrollArea className="h-auto max-h-[500px]">
      <div className="space-y-3">
        {payees.map((payee) => {
          // Safely parse and format the date
          const createdAtDate = parseISO(payee.createdAt);
          const formattedDate = isValid(createdAtDate) ? format(createdAtDate, "PP") : "Invalid Date";

          return (
            <Link key={payee.id} href={`/dashboard/payees/${payee.id}/transactions`} passHref>
               <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"> {/* Added cursor-pointer */}
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" title={payee.name}>
                        {payee.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added: {formattedDate}
                      </p>
                    </div>
                    {payee.category && (
                      <Badge variant="secondary" className="ml-4 shrink-0">{payee.category}</Badge>
                    )}
                    {/* Add Edit/Delete buttons here later if needed */}
                  </div>
               </Card>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
