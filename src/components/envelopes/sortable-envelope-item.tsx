"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Envelope } from '@/types';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil, GripVertical, CalendarClock, Trash2 } from 'lucide-react'; // Import GripVertical, Trash2
import { useAppContext } from "@/context/AppContext";
import { startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils"; // Import cn
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface SortableEnvelopeItemProps {
  id: string;
  envelope: Envelope;
  onEditClick: (event: React.MouseEvent) => void;
}

// Function to get the ordinal suffix for a day number
function getDaySuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function SortableEnvelopeItem({ id, envelope, onEditClick }: SortableEnvelopeItemProps) {
  const { getEnvelopeSpending, getEnvelopeBalanceWithRollover, deleteEnvelope } = useAppContext(); // Added deleteEnvelope
  const { toast } = useToast(); // Added toast
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is on top
  };

  const currentMonthPeriod = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
  const spentThisMonth = getEnvelopeSpending(envelope.id, currentMonthPeriod);
  const progress = envelope.budgetAmount > 0 ? (spentThisMonth / envelope.budgetAmount) * 100 : 0;
  const availableBalance = getEnvelopeBalanceWithRollover(envelope.id);
  const dueDateString = envelope.dueDate ? `${envelope.dueDate}${getDaySuffix(envelope.dueDate)}` : '';
  const hasEstimatedAmount = typeof envelope.estimatedAmount === 'number' && !isNaN(envelope.estimatedAmount);

  const handleDeleteClick = (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent click from bubbling to the Link and causing navigation
      // No event.preventDefault() here, as it would stop the AlertDialogTrigger.
      // The AlertDialog component will handle opening the dialog.
  };

  const confirmDelete = () => {
    deleteEnvelope(envelope.id);
    toast({
      title: "Envelope Deleted",
      description: `Envelope "${envelope.name}" and associated transactions have been modified.`, // Updated message
      variant: "destructive",
    });
  };

  return (
    <li
        ref={setNodeRef}
        style={style}
        className="group relative" // Remove touch-none from li
        {...attributes} // Spread attributes here, not on the handle
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
         <Button
            variant="ghost"
            size="icon"
            // Apply touch-none specifically to the handle
            className={cn("cursor-grab h-8 w-8 text-muted-foreground hover:bg-muted/70 active:cursor-grabbing touch-none")}
            {...listeners} // Spread listeners onto the handle
            aria-label={`Drag ${envelope.name}`}
        >
            <GripVertical className="h-4 w-4" />
        </Button>

        {/* Envelope Content */}
        <Link href={`/dashboard/envelopes/${envelope.id}/transactions`} passHref className="flex-1 block p-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="relative"> {/* Container for positioning edit/delete buttons */}
            {/* Buttons Container */}
            <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-10">
              {/* Edit Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onEditClick}
                aria-label={`Edit ${envelope.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {/* Delete Button with Confirmation */}
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 text-muted-foreground hover:text-destructive"
                     onClick={handleDeleteClick} // This onClick now only calls stopPropagation
                     aria-label={`Delete ${envelope.name}`}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                     <AlertDialogDescription>
                       This action cannot be undone. This will permanently delete the envelope
                       "{envelope.name}". Transactions associated with this envelope will become uncategorized.
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     <AlertDialogAction onClick={confirmDelete} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                       Delete
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
            </div>

            {/* Envelope Details */}
            <div className="flex justify-between items-start mb-1 pr-16"> {/* Adjust padding for buttons */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline">
                  <span className="font-medium truncate block text-sm" title={envelope.name}>{envelope.name}</span>
                  {hasEstimatedAmount && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (Est: ${envelope.estimatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
                {dueDateString && (
                  <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                    <CalendarClock className="mr-1 h-3 w-3" /> Due: {dueDateString}
                  </span>
                )}
              </div>
              <span className={`font-semibold text-sm ${availableBalance < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
                ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Spent (Month): ${spentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span>Budget (Month): ${envelope.budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </Link>
      </div>
    </li>
  );
}
