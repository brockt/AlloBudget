"use client";

import type { Envelope } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mails, DollarSign, Target, TrendingDown, TrendingUp, CalendarDays } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface EnvelopeCardProps {
  envelope: Envelope;
}

export function EnvelopeCard({ envelope }: EnvelopeCardProps) {
  const { getEnvelopeSpending } = useAppContext();
  
  const currentMonthPeriod = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
  const spentAmount = getEnvelopeSpending(envelope.id, currentMonthPeriod);
  const remainingAmount = envelope.budgetAmount - spentAmount;
  const progress = envelope.budgetAmount > 0 ? (spentAmount / envelope.budgetAmount) * 100 : 0;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-lg flex items-center">
            <Mails className="mr-2 h-5 w-5 text-primary" />
            {envelope.name}
          </CardTitle>
          <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full flex items-center">
            <Target className="mr-1 h-3 w-3" /> Budget: ${envelope.budgetAmount.toLocaleString()}
          </span>
        </div>
         <CardDescription className="flex items-center text-xs pt-1">
           <CalendarDays className="mr-1 h-3 w-3" /> Created: {format(new Date(envelope.createdAt), "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow flex flex-col justify-between">
        <div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground flex items-center">
                <TrendingDown className="mr-1 h-4 w-4 text-red-500" /> Spent
              </span>
              <span>${spentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground flex items-center">
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" /> Remaining
              </span>
              <span className={remainingAmount < 0 ? "text-destructive" : "text-green-600 dark:text-green-500"}>
                ${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-2"> {/* Pushes progress bar to the bottom */}
          <Progress value={Math.min(progress, 100)} className="h-3 rounded-lg" />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {Math.min(progress, 100).toFixed(0)}% of budget used
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
