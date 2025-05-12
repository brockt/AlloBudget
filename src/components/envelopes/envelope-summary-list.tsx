"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { Envelope } from "@/types";
import { CalendarClock, Pencil, Info } from 'lucide-react'; // Import Info icon
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditEnvelopeForm } from "./edit-envelope-form"; // Import the new edit form
import Link from "next/link"; // Import Link for navigation
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip

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

export default function EnvelopeSummaryList() {
  const { envelopes, getEnvelopeSpending, getEnvelopeBalanceWithRollover } = useAppContext(); // Use both functions
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (envelopes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No envelopes configured.</p>
        <p className="text-sm text-muted-foreground mt-1">Add an envelope using the button in the page header.</p>
      </div>
    );
  }

  const currentMonthPeriod = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

  // Group envelopes by category
  const groupedEnvelopes = envelopes.reduce((acc, envelope) => {
    const category = envelope.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(envelope);
    return acc;
  }, {} as Record<string, Envelope[]>);

  // Sort envelopes within each category by dueDate (ascending, undefined last)
  Object.keys(groupedEnvelopes).forEach(category => {
    groupedEnvelopes[category].sort((a, b) => {
      const dueDateA = a.dueDate ?? Infinity; // Treat undefined as very large
      const dueDateB = b.dueDate ?? Infinity;
      if (dueDateA !== dueDateB) {
        return dueDateA - dueDateB;
      }
      // Secondary sort by name if due dates are the same or both undefined
      return a.name.localeCompare(b.name);
    });
  });

  // Determine default open categories (e.g., the first one)
  const categories = Object.keys(groupedEnvelopes).sort((a, b) => {
    if (a === "Uncategorized") return 1; // Put Uncategorized last
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b); // Sort other categories alphabetically
  });
  const defaultOpenCategory = categories.length > 0 ? [categories[0]] : [];

  const handleEditClick = (event: React.MouseEvent, envelope: Envelope) => {
    event.stopPropagation(); // Prevent link navigation when clicking edit
    event.preventDefault(); // Prevent link navigation when clicking edit
    setEditingEnvelope(envelope);
    setIsEditDialogOpen(true);
  };

  return (
    <TooltipProvider>
     <ScrollArea className="h-auto max-h-[600px]"> {/* Adjust max height if needed */}
        <Accordion type="multiple" defaultValue={defaultOpenCategory} className="w-full">
            {categories.map(category => (
                <AccordionItem value={category} key={category}>
                    <AccordionTrigger className="text-lg font-semibold px-1 hover:no-underline">
                        {category} ({groupedEnvelopes[category].length})
                    </AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-3 pl-1 pr-2">
                            {groupedEnvelopes[category].map(envelope => {
                                const spentThisMonth = getEnvelopeSpending(envelope.id, currentMonthPeriod);
                                // Calculate progress based on this month's spending vs budget
                                const progress = envelope.budgetAmount > 0 ? (spentThisMonth / envelope.budgetAmount) * 100 : 0;
                                // Get the total available balance including rollover
                                const availableBalance = getEnvelopeBalanceWithRollover(envelope.id);
                                const dueDateString = envelope.dueDate ? `${envelope.dueDate}${getDaySuffix(envelope.dueDate)}` : '';
                                // Check if estimatedAmount exists and is a valid number (not null/undefined/NaN)
                                const hasEstimatedAmount = typeof envelope.estimatedAmount === 'number' && !isNaN(envelope.estimatedAmount);

                                return (
                                    // Wrap the list item content with Link
                                     <li key={envelope.id} className="group relative">
                                        <Link href={`/dashboard/envelopes/${envelope.id}/transactions`} passHref className="block p-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                                            {/* Edit Button - positioned top right */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10" // Ensure button is above link
                                                onClick={(e) => handleEditClick(e, envelope)}
                                                aria-label={`Edit ${envelope.name}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            <div className="flex justify-between items-start mb-1 pr-8"> {/* Added padding-right */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center">
                                                    <span className="font-medium truncate block text-sm" title={envelope.name}>{envelope.name}</span>
                                                    {/* Show Info icon and tooltip only if estimatedAmount is a valid number */}
                                                    {hasEstimatedAmount && (
                                                        <Tooltip delayDuration={300}>
                                                            <TooltipTrigger asChild>
                                                                {/* Use a span that can receive focus/hover */}
                                                                <span className="ml-1.5 inline-flex items-center justify-center cursor-help" tabIndex={0}>
                                                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                {/* Ensure the amount is formatted */}
                                                                <p>Est: ${envelope.estimatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                {dueDateString && (
                                                  <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                    <CalendarClock className="mr-1 h-3 w-3" /> Due: {dueDateString}
                                                  </span>
                                                )}
                                              </div>
                                              {/* Display the available balance including rollover */}
                                              <span className={`font-semibold text-sm ${availableBalance < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
                                                  ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                            {/* Progress bar still reflects this month's spending */}
                                            <Progress value={Math.min(progress, 100)} className="h-2" />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            {/* Show spending for the current month */}
                                            <span>Spent (Month): ${spentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span>Budget (Month): ${envelope.budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </ScrollArea>

      {/* Edit Envelope Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Envelope</DialogTitle>
            <DialogDescription>
              Modify the details for the envelope "{editingEnvelope?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingEnvelope && (
              <EditEnvelopeForm
                envelope={editingEnvelope}
                onSuccess={() => setIsEditDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
