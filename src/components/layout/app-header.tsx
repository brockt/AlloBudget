
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
      <path d="M50 15 L20 85 L80 85 Z M40 65 L60 65 L55 50 Z" />
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
