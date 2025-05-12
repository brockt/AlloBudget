
"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Envelope } from "@/types";
import { Pencil, GripVertical } from 'lucide-react'; // Added GripVertical for drag handle
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EditEnvelopeForm } from "./edit-envelope-form";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableEnvelopeItem } from './sortable-envelope-item'; // Import the new sortable item component

export default function EnvelopeSummaryList() {
  const { envelopes, updateEnvelopeOrder, getEnvelopeSpending, getEnvelopeBalanceWithRollover } = useAppContext();
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (envelopes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No envelopes configured.</p>
        <p className="text-sm text-muted-foreground mt-1">Add an envelope using the button in the page header.</p>
      </div>
    );
  }

  // Group envelopes by category (order within category depends on the main envelopes array order)
  const groupedEnvelopes = envelopes.reduce((acc, envelope) => {
    const category = envelope.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(envelope);
    return acc;
  }, {} as Record<string, Envelope[]>);


  // Sort categories alphabetically, placing "Uncategorized" last
  const categories = Object.keys(groupedEnvelopes).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });
  const defaultOpenCategory = categories.length > 0 ? [categories[0]] : [];

  const handleEditClick = (event: React.MouseEvent, envelope: Envelope) => {
    event.stopPropagation();
    event.preventDefault();
    setEditingEnvelope(envelope);
    setIsEditDialogOpen(true);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const originalEnvelopes = [...envelopes]; // Get a copy of the current envelopes array

      const oldIndex = originalEnvelopes.findIndex(env => env.id === active.id);
      const newIndex = originalEnvelopes.findIndex(env => env.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedEnvelopes = arrayMove(originalEnvelopes, oldIndex, newIndex);
        // Call the context function to update the state and persist
        updateEnvelopeOrder(reorderedEnvelopes);
      } else {
        console.error("Could not find dragged items in the original array during drag end");
      }
    }
  }


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-auto max-h-[600px]">
        <Accordion type="multiple" defaultValue={defaultOpenCategory} className="w-full">
          {categories.map(category => {
            const categoryEnvelopes = groupedEnvelopes[category];
            const envelopeIds = categoryEnvelopes.map(env => env.id); // Get IDs for SortableContext

            return (
              <AccordionItem value={category} key={category}>
                <AccordionTrigger className="text-lg font-semibold px-1 hover:no-underline">
                  {category} ({categoryEnvelopes.length})
                </AccordionTrigger>
                <AccordionContent>
                  {/* SortableContext wraps the list for drag-and-drop */}
                  <SortableContext
                    items={envelopeIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-3 pl-1 pr-2">
                      {categoryEnvelopes.map(envelope => (
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
            );
          })}
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
    </DndContext>
  );
}

