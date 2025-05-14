
"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { LogOut } from "lucide-react"; // Import LogOut icon

// Custom SVG Logo component
function AlloBudgetLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor" 
    >
      <path d="M20 85 L50 15 L80 85 L70 85 L55 55 L45 55 L30 85 Z" />
      <path d="M48 45 A 15 15 0 0 1 48 75 L 35 75 L 35 45 Z M 48 45 L 65 45 A 15 15 0 0 1 65 75 L 48 75" fill="hsl(var(--background))" />
      <path d="M48 45 A 15 15 0 0 1 48 75 M 48 45 L 65 45 A 15 15 0 0 1 65 75" stroke="currentColor" strokeWidth="5" fill="none"/>
    </svg>
  );
}


export function AppHeader() {
  const { currentUser, signOut } = useAuth(); // Get signOut function and currentUser

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center space-x-2 text-lg font-bold text-primary">
            <AlloBudgetLogo className="h-7 w-7" />
            <span className="hidden sm:inline-block">AlloBudget</span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
           <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <ThemeToggle />
          {currentUser && (
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign Out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
