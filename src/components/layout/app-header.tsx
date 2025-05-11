"use client";

import Link from "next/link";
import { Coins } from "lucide-react"; // Using Coins as a budget/money related icon
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <Link href="/" className="flex items-center space-x-2 text-lg font-bold text-primary">
            <Coins className="h-7 w-7" />
            <span className="hidden sm:inline-block">Pocket Budgeteer</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {/* User profile/actions could go here */}
        </div>
      </div>
    </header>
  );
}
