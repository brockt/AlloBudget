
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
  const { envelopes, orderedCategories, updateCategoryOrder, updateEnvelopeOrder } = useAppContext(); // Added updateEnvelopeOrder
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null); // For drag overlay (optional, but good practice)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Require a slight drag distance
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

  function handleDragStart(event: DragStartEvent) {
     setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null); // Clear active ID

    if (over && active.id !== over.id) {
       // Check if the dragged item is a category
       const isActiveCategory = typeof active.id === 'string' && orderedCategories.includes(active.id);
       const isOverCategory = typeof over.id === 'string' && orderedCategories.includes(over.id);

       if (isActiveCategory && isOverCategory) {
           // --- Category Reordering Logic ---
           const oldIndex = orderedCategories.findIndex(cat => cat === active.id);
           const newIndex = orderedCategories.findIndex(cat => cat === over.id);

           if (oldIndex !== -1 && newIndex !== -1) {
               const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
               updateCategoryOrder(newOrder); // Update context state and localStorage
           } else {
                console.error(`Category indices not found for IDs: "${active.id}", "${over.id}"`);
           }
       } else if (!isActiveCategory && !isOverCategory) {
           // --- Envelope Reordering Logic ---
           // Assume active.id and over.id are envelope IDs
           const activeEnvelopeId = active.id as string;
           const overEnvelopeId = over.id as string;

           // Find indices in the global envelopes array
           const oldEnvelopeIndex = envelopes.findIndex(env => env.id === activeEnvelopeId);
           const newEnvelopeIndex = envelopes.findIndex(env => env.id === overEnvelopeId);

           if (oldEnvelopeIndex !== -1 && newEnvelopeIndex !== -1) {
               // Important: Check if envelopes are in the same category.
               // Dragging between categories is not visually supported here,
               // but this prevents unintended reordering if dropped over an item in another category.
               const activeEnvelope = envelopes[oldEnvelopeIndex];
               const overEnvelope = envelopes[newEnvelopeIndex];

               if (activeEnvelope.category === overEnvelope.category) {
                   const reorderedEnvelopes = arrayMove(envelopes, oldEnvelopeIndex, newEnvelopeIndex);
                   updateEnvelopeOrder(reorderedEnvelopes); // Update the global order
               } else {
                 // Optionally handle or log the attempt to drag between categories
                 console.log("Attempted to drag envelope between different categories - not supported by current UI structure.");
               }
           } else {
               console.error(`Envelope indices not found for IDs: "${activeEnvelopeId}", "${overEnvelopeId}"`);
           }
       } else {
           // This might happen if dragging a category over an envelope or vice versa, which shouldn't occur with current setup
           console.warn("Ignoring drag end event - mixed types or unexpected target:", { activeId: active.id, overId: over.id });
       }
    }
  }


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd} // Use the updated handler
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
                  // Pass the envelopes for this category, ordered as they are in the global state
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
