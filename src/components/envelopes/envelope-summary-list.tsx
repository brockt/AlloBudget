
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
import { cn } from "@/lib/utils"; // Import cn

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
      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      const isActiveCategory = orderedCategories.includes(activeIdStr);
      const isOverCategory = orderedCategories.includes(overIdStr);

      if (isActiveCategory && isOverCategory) {
        // --- Category Reordering Logic ---
        const oldIndex = orderedCategories.findIndex(cat => cat === activeIdStr);
        const newIndex = orderedCategories.findIndex(cat => cat === overIdStr);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
          updateCategoryOrder(newOrder); // Update context state and persistence
        } else {
          console.error(`Error during category drag end: Could not find category indices for IDs: "${activeIdStr}", "${overIdStr}"`, { orderedCategories });
        }
      } else {
        // --- Envelope Reordering Logic (or invalid drag) ---
        // This block is now an 'else', so it only runs if it's not a category-on-category drag.
        const activeEnvelope = envelopes.find(env => env.id === activeIdStr);
        const overEnvelope = envelopes.find(env => env.id === overIdStr);

        if (activeEnvelope && overEnvelope) {
          if (activeEnvelope.category === overEnvelope.category) {
            // Envelopes are valid and in the same category, reorder them.
            // updateEnvelopeOrder expects the full list of envelopes to re-calculate global orderIndex.
            const activeEnvelopeGlobalIndex = envelopes.findIndex(env => env.id === activeEnvelope.id);
            const overEnvelopeGlobalIndex = envelopes.findIndex(env => env.id === overEnvelope.id);

            if (activeEnvelopeGlobalIndex !== -1 && overEnvelopeGlobalIndex !== -1) {
              const reorderedEnvelopes = arrayMove(envelopes, activeEnvelopeGlobalIndex, overEnvelopeGlobalIndex);
              updateEnvelopeOrder(reorderedEnvelopes);
            } else {
              // This should ideally not happen if find succeeded earlier.
              console.error(`Error during envelope drag end: Could not find global envelope indices for IDs: "${activeIdStr}", "${overIdStr}"`, { envelopes });
            }
          } else {
            // Dragging an envelope to a different category.
            // Current UI/setup doesn't directly support this reordering action, so we ignore.
            console.log("Attempted to drag envelope between different categories - operation ignored.", { activeEnvelope, overEnvelope });
          }
        } else {
          // Not category-on-category, and not envelope-on-envelope.
          // Could be dragging a category over an envelope, or vice versa, or invalid IDs.
          console.warn("Ignoring drag end event - mixed types, invalid IDs, or item not found:", { activeId: activeIdStr, overId: overIdStr });
        }
      }
    } else if (over && active.id === over.id) {
      // Item dropped on itself, no action.
      console.log("Item dropped on itself, no reorder action taken.");
    } else {
      // `over` is null (dropped outside a valid target) or `active.id === over.id` was already handled.
      // No action needed.
      console.log("Drag ended outside a valid target or was cancelled.");
    }
  }


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd} // Use the updated handler
    >
      {/* Ensure ScrollArea has explicit overflow and max-height */}
      <ScrollArea className={cn("max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto")}> {/* Adjusted max-height */}
        {/* SortableContext for Categories */}
        <SortableContext
          // Provide the *full* ordered list of categories to the context
          items={orderedCategories}
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="multiple" defaultValue={defaultOpenCategory} className="w-full space-y-1">
            {/* Iterate over the ordered category list */}
            {orderedCategories.map(category => {
              // Get the envelopes for this category, preserving their current global order
              const categoryEnvelopes = envelopes.filter(env => env.category === category);

              // Only render the category if it has envelopes
              if (categoryEnvelopes.length === 0) {
                return null;
              }

              return (
                <SortableCategoryAccordionItem
                  key={category}
                  category={category} // The ID for sorting categories
                  // Pass the filtered & ordered envelopes for this category
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
                key={editingEnvelope.id} // Add key here
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
