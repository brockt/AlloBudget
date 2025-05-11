
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Perform the redirect to the dashboard page
    router.replace('/dashboard');
  }, [router]);

  // Display a loading message while redirecting
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="flex flex-col items-center p-8 rounded-lg shadow-xl bg-card">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Pocket Budgeteer</h1>
        <p className="text-muted-foreground">Redirecting you to your dashboard...</p>
      </div>
    </div>
  );
}
