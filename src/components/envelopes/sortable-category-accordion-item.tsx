
"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Envelope } from '@/types';
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { GripVertical } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableEnvelopeItem } from './sortable-envelope-item';
import { cn } from "@/lib/utils";

interface SortableCategoryAccordionItemProps {
  category: string;
  envelopesInCategory: Envelope[];
  setEditingEnvelope: (envelope: Envelope | null) => void;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  currentViewMonth: Date; // Added prop
}

export function SortableCategoryAccordionItem({
  category,
  envelopesInCategory,
  setEditingEnvelope,
  setIsEditDialogOpen,
  currentViewMonth, // Use prop
}: SortableCategoryAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleEditClick = (event: React.MouseEvent, envelope: Envelope) => {
    event.stopPropagation();
    event.preventDefault();
    setEditingEnvelope(envelope);
    setIsEditDialogOpen(true);
  };

  const envelopeIds = envelopesInCategory.map(env => env.id);

  return (
    <div ref={setNodeRef} style={style} className={cn("bg-card border rounded-md", isDragging ? "shadow-lg" : "shadow-sm")}>
      <AccordionItem value={category} className="border-b-0">
        <div className="flex items-center border-b">
           <Button
            variant="ghost"
            size="icon"
            className="cursor-grab h-10 w-10 text-muted-foreground hover:bg-muted/70 active:cursor-grabbing rounded-none"
            {...attributes}
            {...listeners}
            aria-label={`Drag category ${category}`}
          >
            <GripVertical className="h-5 w-5" />
          </Button>
          <AccordionTrigger className="text-lg font-semibold px-3 py-4 flex-1 hover:no-underline">
            {category} ({envelopesInCategory.length})
          </AccordionTrigger>
        </div>
        <AccordionContent className="pt-0 pb-3 px-3">
          <SortableContext items={envelopeIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3 pt-3">
              {envelopesInCategory.map(envelope => (
                <SortableEnvelopeItem
                  key={envelope.id}
                  id={envelope.id}
                  envelope={envelope}
                  onEditClick={(e) => handleEditClick(e, envelope)}
                  currentViewMonth={currentViewMonth} // Pass currentViewMonth
                />
              ))}
            </ul>
          </SortableContext>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
