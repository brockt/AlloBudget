
"use client";

import { useAppContext } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { Envelope } from "@/types";
import { CalendarClock } from 'lucide-react'; // Import icon

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
  const { envelopes, getEnvelopeSpending } = useAppContext();

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


  return (
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
                                const spent = getEnvelopeSpending(envelope.id, currentMonthPeriod);
                                const progress = envelope.budgetAmount > 0 ? (spent / envelope.budgetAmount) * 100 : 0;
                                const remaining = envelope.budgetAmount - spent;
                                const dueDateString = envelope.dueDate ? `${envelope.dueDate}${getDaySuffix(envelope.dueDate)}` : '';

                                return (
                                    <li key={envelope.id} className="text-sm p-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="flex-1 min-w-0">
                                            <span className="font-medium truncate block" title={envelope.name}>{envelope.name}</span>
                                            {dueDateString && (
                                              <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                <CalendarClock className="mr-1 h-3 w-3" /> Due: {dueDateString}
                                              </span>
                                            )}
                                          </div>
                                          <span className={`font-semibold ${remaining < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
                                              ${remaining.toFixed(2)}
                                          </span>
                                        </div>
                                        <Progress value={Math.min(progress, 100)} className="h-2" />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Spent: ${spent.toFixed(2)}</span>
                                        <span>Budget: ${envelope.budgetAmount.toFixed(2)}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    </ScrollArea>
  );
}
