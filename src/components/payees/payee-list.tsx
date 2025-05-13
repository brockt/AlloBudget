"use client";

import { useAppContext } from "@/context/AppContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card"; // Use Card for consistent styling
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns"; // Import parseISO and isValid
import Link from "next/link"; // Import Link
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { Payee } from "@/types"; // Import Payee type

interface PayeeListProps {
  onEditPayee: (payee: Payee) => void; // Add prop for handling edit
}


export function PayeeList({ onEditPayee }: PayeeListProps) { // Add onEditPayee to props
  const { payees } = useAppContext();

  if (payees.length === 0) {
    // This case should ideally be handled by the parent component (PayeesPage)
    return null;
  }

  const handleEditClick = (event: React.MouseEvent, payee: Payee) => {
    event.preventDefault(); // Prevent link navigation
    event.stopPropagation(); // Stop event from bubbling up to the Link
    onEditPayee(payee);
  };


  return (
    <ScrollArea className="h-full"> {/* Changed: h-full to fill container */}
      <div className="space-y-3 pr-2"> {/* Added pr-2 for scrollbar spacing */}
        {payees.map((payee) => {
          // Safely parse and format the date
          const createdAtDate = parseISO(payee.createdAt);
          const formattedDate = isValid(createdAtDate) ? format(createdAtDate, "PP") : "Invalid Date";

          return (
            <Card key={payee.id} className="p-4 hover:bg-muted/50 transition-colors relative group"> {/* Added relative group */}
                {/* Link wrapping the content, but not the button */}
                <Link href={`/dashboard/payees/${payee.id}/transactions`} passHref className="block cursor-pointer">
                    <div className="flex justify-between items-center pr-10"> {/* Add padding for the button */}
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
                    </div>
                </Link>
                {/* Edit Button positioned absolutely */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    onClick={(e) => handleEditClick(e, payee)}
                    aria-label={`Edit ${payee.name}`}
                >
                    <Pencil className="h-4 w-4" />
                </Button>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

