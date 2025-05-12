
"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Accordion } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Envelope } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EditEnvelopeForm } from "./edit-envelope-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategoryAccordionItem } from './sortable-category-accordion-item'; // Import the new sortable category item

export default function EnvelopeSummaryList() {
  const { envelopes, orderedCategories, updateCategoryOrder } = useAppContext();
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null); // For drag overlay (optional, but good practice)

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

  // Group envelopes by category using the main envelopes array
  const groupedEnvelopes = envelopes.reduce((acc, envelope) => {
    const category = envelope.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(envelope);
    return acc;
  }, {} as Record<string, Envelope[]>);

  // Filter orderedCategories to only include those present in groupedEnvelopes
  const categoriesToDisplay = orderedCategories.filter(cat => groupedEnvelopes[cat] && groupedEnvelopes[cat].length > 0);

  const defaultOpenCategory = categoriesToDisplay.length > 0 ? [categoriesToDisplay[0]] : [];

  function handleCategoryDragStart(event: DragStartEvent) {
     setActiveId(event.active.id as string);
  }

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null); // Clear active ID

    if (over && active.id !== over.id) {
       const oldIndex = orderedCategories.findIndex(cat => cat === active.id);
       const newIndex = orderedCategories.findIndex(cat => cat === over.id);

       if (oldIndex !== -1 && newIndex !== -1) {
           const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
           updateCategoryOrder(newOrder); // Update context state and localStorage
       } else {
            console.error("Could not find dragged categories in the ordered list during drag end");
       }
    }
  }


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleCategoryDragStart}
      onDragEnd={handleCategoryDragEnd}
    >
      <ScrollArea className="h-auto max-h-[600px]">
        {/* SortableContext for Categories */}
        <SortableContext
          items={categoriesToDisplay} // Use the filtered list for sortable items
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="multiple" defaultValue={defaultOpenCategory} className="w-full space-y-1">
            {categoriesToDisplay.map(category => {
              const categoryEnvelopes = groupedEnvelopes[category];
              return (
                <SortableCategoryAccordionItem
                  key={category}
                  category={category}
                  envelopesInCategory={categoryEnvelopes}
                  setEditingEnvelope={setEditingEnvelope}
                  setIsEditDialogOpen={setIsEditDialogOpen}
                />
              );
            })}
          </Accordion>
        </SortableContext>
      </ScrollArea>

       {/* Optional Drag Overlay for better visual feedback */}
      {/* <DragOverlay>
        {activeId ? (
           <div className="p-4 bg-primary text-primary-foreground rounded-md shadow-lg opacity-75">Dragging {activeId}</div>
         ) : null}
       </DragOverlay> */}

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
