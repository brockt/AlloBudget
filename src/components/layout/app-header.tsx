
"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Removed container class to allow full width alignment */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side: Mobile Trigger and Logo */}
        <div className="flex items-center gap-2">
          {/* Sidebar Trigger for mobile - visible only on md and below */}
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
           {/* App Logo/Name */}
          <Link href="/dashboard" className="flex items-center space-x-2 text-lg font-bold text-primary">
            <Coins className="h-7 w-7" />
            <span className="hidden sm:inline-block">Pocket Budgeteer</span>
          </Link>
        </div>


        {/* Right-side controls */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {/* Desktop sidebar toggle is handled by SidebarRail, mobile by SidebarTrigger above */}
        </div>
      </div>
    </header>
  );
}

