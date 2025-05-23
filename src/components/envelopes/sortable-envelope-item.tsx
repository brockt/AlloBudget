"use client";

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Envelope } from '@/types';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, GripVertical, CalendarClock, Trash2, Save, XCircle } from 'lucide-react';
import { useAppContext } from "@/context/AppContext";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SortableEnvelopeItemProps {
  id: string;
  envelope: Envelope;
  onEditClick: (event: React.MouseEvent) => void;
  currentViewMonth: Date;
}

function getDaySuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th';
  }
}

export function SortableEnvelopeItem({ id, envelope, onEditClick, currentViewMonth }: SortableEnvelopeItemProps) {
  const {
    getEnvelopeSpending,
    getEnvelopeBalanceAsOfEOM,
    deleteEnvelope,
    setMonthlyAllocation,
    getMonthlyAllocation,
    getEffectiveMonthlyBudgetWithRollover
  } = useAppContext();
  const { toast } = useToast();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id });

  const [isEditingMonthlyBudget, setIsEditingMonthlyBudget] = useState(false);
  const [monthlyBudgetValue, setMonthlyBudgetValue] = useState<string>("");

  const specificAllocationForThisMonth = getMonthlyAllocation(envelope.id, currentViewMonth);
  const effectiveBudgetForThisMonth = getEffectiveMonthlyBudgetWithRollover(envelope.id, currentViewMonth);

  const spentThisMonth = getEnvelopeSpending(envelope.id, currentViewMonth);
  const availableBalance = getEnvelopeBalanceAsOfEOM(envelope.id, currentViewMonth);

  useEffect(() => {
    setMonthlyBudgetValue(specificAllocationForThisMonth.toFixed(2));
  }, [specificAllocationForThisMonth, currentViewMonth]);


  const style = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto',
  };

  const progress = effectiveBudgetForThisMonth > 0 ? (spentThisMonth / effectiveBudgetForThisMonth) * 100 : 0;
  const dueDateString = envelope.dueDate ? `${envelope.dueDate}${getDaySuffix(envelope.dueDate)}` : '';
  const hasEstimatedAmount = typeof envelope.estimatedAmount === 'number' && !isNaN(envelope.estimatedAmount);

  const confirmDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await deleteEnvelope(envelope.id);
      toast({ title: "Envelope Deleted", description: `Envelope "${envelope.name}" has been deleted.`, variant: "default" });
    } catch (error) {
      console.error("Failed to delete envelope:", error);
      toast({ title: "Error Deleting Envelope", description: (error as Error)?.message || "Could not delete the envelope. Please try again.", variant: "destructive" });
    }
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation(); event.preventDefault(); onEditClick(event);
  };

  const handleMonthlyBudgetEditToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (isEditingMonthlyBudget) {
      handleSaveMonthlyBudget();
    } else {
      setMonthlyBudgetValue(specificAllocationForThisMonth.toFixed(2));
    }
    setIsEditingMonthlyBudget(!isEditingMonthlyBudget);
  };

  const handleCancelMonthlyBudgetEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setIsEditingMonthlyBudget(false);
    setMonthlyBudgetValue(specificAllocationForThisMonth.toFixed(2));
  };

  const handleSaveMonthlyBudget = async () => {
    const amount = parseFloat(monthlyBudgetValue);
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number for the budget.", variant: "destructive"});
      return;
    }
    try {
      await setMonthlyAllocation(envelope.id, format(currentViewMonth, "yyyy-MM"), amount);
      toast({ title: "Monthly Budget Updated", description: `Budget for ${envelope.name} for ${format(currentViewMonth, "MMMM yyyy")} set to $${amount.toFixed(2)}.` });
      setIsEditingMonthlyBudget(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update monthly budget.", variant: "destructive"});
      console.error("Failed to save monthly budget:", error);
    }
  };


  return (
    <li ref={setNodeRef} style={style} className="group relative" {...attributes}>
      <TooltipProvider>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className={cn("cursor-grab h-8 w-8 text-muted-foreground hover:bg-muted/70 active:cursor-grabbing touch-none")} {...listeners} aria-label={`Drag ${envelope.name}`}>
            <GripVertical className="h-4 w-4" />
          </Button>
          <div className="flex-1 block p-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors">
            <div className="relative">
              <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-10">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleEditClick} aria-label={`Edit ${envelope.name} Default Target`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" aria-label={`Delete ${envelope.name}`} onClick={(e) => e.stopPropagation()}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete "{envelope.name}".</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Link href={`/dashboard/envelopes/${envelope.id}/transactions?month=${format(currentViewMonth, "yyyy-MM")}`} passHref>
                <div className="cursor-pointer">
                    <div className="flex justify-between items-start mb-1 pr-16">
                    <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block text-sm" title={envelope.name}>{envelope.name}</span>
                        {hasEstimatedAmount && (<span className="ml-1.5 text-xs text-muted-foreground">(Est: ${envelope.estimatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>)}
                        {dueDateString && (<span className="text-xs text-muted-foreground flex items-center mt-0.5"><CalendarClock className="mr-1 h-3 w-3" /> Due: {dueDateString}</span>)}
                    </div>
                    <span className={cn(
                        "text-sm",
                        Math.abs(availableBalance) < 0.001 
                          ? "font-semibold text-green-600 dark:text-green-500" // Treat values very close to zero as positive
                          : availableBalance < 0
                            ? "font-bold text-destructive dark:text-red-400"
                            : "font-semibold text-green-600 dark:text-green-500"
                      )}>
                        ${(Math.abs(availableBalance) < 0.001 ? 0 : availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    </div>
                </div>
              </Link>
              <Progress value={Math.min(progress, 100)} className="h-2 mt-1" />
              <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                <span>Spent: ${spentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <div className="flex items-center gap-1">
                  <span>Budgeted ({format(currentViewMonth, "MMM")}): ${effectiveBudgetForThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {isEditingMonthlyBudget ? (
                    <>
                      <Input
                        type="number"
                        value={monthlyBudgetValue}
                        onChange={(e) => setMonthlyBudgetValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveMonthlyBudget();}}}
                        className="h-6 px-1 py-0.5 text-xs w-20 border-primary"
                        step="0.01"
                      />
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600 hover:text-green-700" onClick={handleSaveMonthlyBudget} aria-label="Save monthly budget">
                        <Save className="h-3 w-3"/>
                      </Button>
                       <Button variant="ghost" size="icon" className="h-5 w-5 text-red-600 hover:text-red-700" onClick={handleCancelMonthlyBudgetEdit} aria-label="Cancel edit monthly budget">
                        <XCircle className="h-3 w-3"/>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={handleMonthlyBudgetEditToggle} aria-label="Edit monthly budget">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </li>
  );
}

