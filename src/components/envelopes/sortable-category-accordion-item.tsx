
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
}

export function SortableCategoryAccordionItem({
  category,
  envelopesInCategory,
  setEditingEnvelope,
  setIsEditDialogOpen
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
      <AccordionItem value={category} className="border-b-0"> {/* Remove default border */}
        <div className="flex items-center border-b"> {/* Add border back for the trigger area */}
           {/* Drag Handle */}
           <Button
            variant="ghost"
            size="icon"
            className="cursor-grab h-10 w-10 text-muted-foreground hover:bg-muted/70 active:cursor-grabbing rounded-none"
            {...attributes} // Spread attributes for sortable
            {...listeners} // Spread listeners for dragging
            aria-label={`Drag category ${category}`}
          >
            <GripVertical className="h-5 w-5" />
          </Button>

          <AccordionTrigger className="text-lg font-semibold px-3 py-4 flex-1 hover:no-underline">
            {category} ({envelopesInCategory.length})
          </AccordionTrigger>
        </div>
        <AccordionContent className="pt-0 pb-3 px-3"> {/* Adjust padding */}
          {/* SortableContext for Envelopes within this Category */}
          <SortableContext
            items={envelopeIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3 pt-3">
              {envelopesInCategory.map(envelope => (
                <SortableEnvelopeItem
                  key={envelope.id}
                  id={envelope.id}
                  envelope={envelope}
                  onEditClick={(e) => handleEditClick(e, envelope)}
                />
              ))}
            </ul>
          </SortableContext>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
