
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
  // DragOverlay, // Uncomment if using overlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategoryAccordionItem } from './sortable-category-accordion-item'; // Import the new sortable category item
import { Package } from "lucide-react"; // Import Package icon

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
      <div className="text-center py-10 border-2 border-dashed rounded-lg p-4 bg-muted/20">
         <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No envelopes configured.</p>
        <p className="text-sm text-muted-foreground mt-1">Add an envelope using the button in the page header.</p>
      </div>
    );
  }

  // Group envelopes by category using the main envelopes array
  const groupedEnvelopes = envelopes.reduce((acc, envelope) => {
    const category = envelope.category || "Uncategorized"; // Should not happen if category is mandatory
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(envelope);
    return acc;
  }, {} as Record<string, Envelope[]>);

  // Determine which categories have envelopes to display
  const categoriesWithEnvelopes = orderedCategories.filter(cat => groupedEnvelopes[cat] && groupedEnvelopes[cat].length > 0);

  // Determine the default open category (first one with envelopes)
  const defaultOpenCategory = categoriesWithEnvelopes.length > 0 ? [categoriesWithEnvelopes[0]] : [];

  function handleCategoryDragStart(event: DragStartEvent) {
     setActiveId(event.active.id as string);
  }

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null); // Clear active ID

    if (over && active.id !== over.id) {
       // Check if both active and over IDs are valid category names (strings) present in the ordered list
       const isActiveCategory = typeof active.id === 'string' && orderedCategories.includes(active.id);
       const isOverCategory = typeof over.id === 'string' && orderedCategories.includes(over.id);

       // Only proceed if BOTH IDs belong to categories in the current context
       if (isActiveCategory && isOverCategory) {
           const oldIndex = orderedCategories.findIndex(cat => cat === active.id);
           const newIndex = orderedCategories.findIndex(cat => cat === over.id);

           // Double-check indices just in case (should always be found now)
           if (oldIndex !== -1 && newIndex !== -1) {
               const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
               updateCategoryOrder(newOrder); // Update context state and localStorage
           } else {
                // This should not happen if the above checks pass
                console.error(`Category indices not found even after validation for IDs: "${active.id}", "${over.id}"`);
           }
       } else {
         // Log or ignore if it's not a category drag or if IDs are mismatched types/contexts
         // console.log("Ignoring drag end event - likely an envelope drag:", { activeId: active.id, overId: over.id });
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
          // Provide the *full* ordered list to the context
          items={orderedCategories}
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="multiple" defaultValue={defaultOpenCategory} className="w-full space-y-1">
            {/* Iterate over the full ordered list */}
            {orderedCategories.map(category => {
              // Check if this category has envelopes before rendering
              const categoryEnvelopes = groupedEnvelopes[category];
              if (!categoryEnvelopes || categoryEnvelopes.length === 0) {
                return null; // Don't render the accordion item if category is empty
              }

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
