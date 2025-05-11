"use client";

import { useAppContext } from "@/context/AppContext";
import { EnvelopeCard } from "./envelope-card";
import { Mails } from "lucide-react";
import Image from "next/image";

export function EnvelopeList() {
  const { envelopes } = useAppContext();

  if (envelopes.length === 0) {
    return (
      <div className="text-center py-10">
        <Mails className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Envelopes Yet</h3>
        <p className="text-muted-foreground">Create envelopes to categorize your spending and manage your budget.</p>
        <Image 
            src="https://picsum.photos/seed/noenvelopes/400/300" 
            alt="Illustration of empty mail slots or piggy bank" 
            width={300}
            height={225}
            className="mx-auto mt-6 rounded-lg shadow-md"
            data-ai-hint="empty mail"
          />
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {envelopes.map((envelope) => (
        <EnvelopeCard key={envelope.id} envelope={envelope} />
      ))}
    </div>
  );
}
