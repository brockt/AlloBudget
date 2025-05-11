"use client";

import { useAppContext } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mails } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";


export default function EnvelopeSummaryList() {
  const { envelopes, getEnvelopeSpending } = useAppContext();

  if (envelopes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No envelopes configured.</p>
        <Link href="/envelopes" passHref className="mt-2">
          <Button variant="link" className="text-primary">Set up your envelopes</Button>
        </Link>
      </div>
    );
  }
  
  const currentMonthPeriod = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

  return (
    <div className="space-y-3">
      <ScrollArea className="h-auto max-h-[300px]">
        <ul className="space-y-3 pr-2">
          {envelopes.map(envelope => {
            const spent = getEnvelopeSpending(envelope.id, currentMonthPeriod);
            const progress = envelope.budgetAmount > 0 ? (spent / envelope.budgetAmount) * 100 : 0;
            const remaining = envelope.budgetAmount - spent;
            return (
              <li key={envelope.id} className="text-sm p-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium truncate" title={envelope.name}>{envelope.name}</span>
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
      </ScrollArea>
      {envelopes.length > 0 && (
         <div className="text-center mt-2">
          <Link href="/envelopes" passHref>
            <Button variant="link" className="text-sm text-primary">
              View All Envelopes <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
