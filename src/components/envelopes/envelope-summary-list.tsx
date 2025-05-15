
"use client";

import { useState, useEffect } from "react";
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategoryAccordionItem } from './sortable-category-accordion-item';
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns"; // Import format

export default function EnvelopeSummaryList() {
  const { envelopes, orderedCategories, updateCategoryOrder, updateEnvelopeOrder, currentViewMonth } = useAppContext();
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Manage defaultOpenCategory based on currentViewMonth or general envelope presence
  const [accordionDefaultOpen, setAccordionDefaultOpen] = useState<string[]>([]);

  const groupedEnvelopes = envelopes.reduce((acc, envelope) => {
    const category = envelope.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(envelope);
    return acc;
  }, {} as Record<string, Envelope[]>);

  useEffect(() => {
    const categoriesWithEnvelopes = orderedCategories.filter(cat => groupedEnvelopes[cat] && groupedEnvelopes[cat].length > 0);
    setAccordionDefaultOpen(categoriesWithEnvelopes.length > 0 ? [categoriesWithEnvelopes[0]] : []);
  }, [orderedCategories, envelopes]); // Recalculate when categories or envelopes change


  if (envelopes.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg p-4 bg-muted/20">
         <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No envelopes configured.</p>
        <p className="text-sm text-muted-foreground mt-1">Add an envelope using the button in the page header.</p>
      </div>
    );
  }

  function handleDragStart(event: DragStartEvent) {
     setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;
      const isActiveCategory = orderedCategories.includes(activeIdStr);
      const isOverCategory = orderedCategories.includes(overIdStr);

      if (isActiveCategory && isOverCategory) {
        const oldIndex = orderedCategories.findIndex(cat => cat === activeIdStr);
        const newIndex = orderedCategories.findIndex(cat => cat === overIdStr);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
          updateCategoryOrder(newOrder);
        }
      } else {
        const activeEnvelope = envelopes.find(env => env.id === activeIdStr);
        const overEnvelope = envelopes.find(env => env.id === overIdStr);
        if (activeEnvelope && overEnvelope && activeEnvelope.category === overEnvelope.category) {
          const activeEnvelopeGlobalIndex = envelopes.findIndex(env => env.id === activeEnvelope.id);
          const overEnvelopeGlobalIndex = envelopes.findIndex(env => env.id === overEnvelope.id);
          if (activeEnvelopeGlobalIndex !== -1 && overEnvelopeGlobalIndex !== -1) {
            const reorderedEnvelopes = arrayMove(envelopes, activeEnvelopeGlobalIndex, overEnvelopeGlobalIndex);
            updateEnvelopeOrder(reorderedEnvelopes);
          }
        }
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ScrollArea className={cn("max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-290px)] overflow-y-auto")}> {/* Adjusted max-height for dashboard context */}
        <SortableContext items={orderedCategories} strategy={verticalListSortingStrategy}>
          <Accordion type="multiple" defaultValue={accordionDefaultOpen} value={accordionDefaultOpen} onValueChange={setAccordionDefaultOpen} className="w-full space-y-1">
            {orderedCategories.map(category => {
              const categoryEnvelopes = envelopes.filter(env => env.category === category);
              if (categoryEnvelopes.length === 0) return null;
              return (
                <SortableCategoryAccordionItem
                  key={`${category}-${format(currentViewMonth, "yyyy-MM")}`} // Key includes month to force re-render on month change
                  category={category}
                  envelopesInCategory={categoryEnvelopes}
                  setEditingEnvelope={setEditingEnvelope}
                  setIsEditDialogOpen={setIsEditDialogOpen}
                  currentViewMonth={currentViewMonth} // Pass currentViewMonth
                />
              );
            })}
          </Accordion>
        </SortableContext>
      </ScrollArea>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Envelope Default Target</DialogTitle>
            <DialogDescription>
              Modify the default monthly target for "{editingEnvelope?.name}". Specific monthly allocations can be set in the list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingEnvelope && (
              <EditEnvelopeForm
                key={editingEnvelope.id}
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
