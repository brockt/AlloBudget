
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth(); // Get user and loading state

  useEffect(() => {
    if (!loading) { // Only redirect once auth state is resolved
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loading, router]);

  // Display a loading message while redirecting or auth state is resolving
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="flex flex-col items-center p-8 rounded-lg shadow-xl bg-card">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to AlloBudget</h1>
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    </div>
  );
}
