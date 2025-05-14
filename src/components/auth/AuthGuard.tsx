
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <h1 className="text-xl font-semibold text-foreground">Checking authentication...</h1>
      </div>
    );
  }

  if (!currentUser) {
    // This return is mainly for the brief period before the redirect effect kicks in,
    // or if the redirect somehow fails. Ideally, the user sees the loading screen
    // and then is redirected.
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <h1 className="text-xl font-semibold text-foreground">Redirecting to login...</h1>
      </div>
    );
  }

  return <>{children}</>;
}
