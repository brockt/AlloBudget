
"use client";

import type { ReactNode } from 'react';
import { Coins } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  // SidebarFooter, // Uncomment if footer is used
  // SidebarInset, // Uncomment if inset layout is used
  SidebarRail // This provides the desktop expand/collapse rail
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { AppHeader } from "@/components/layout/app-header";
// import { Button } from '@/components/ui/button'; // For potential footer actions
import Link from 'next/link';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    // Explicitly set defaultOpen to false to ensure it starts collapsed on desktop,
    // overriding potential cookie issues observed in browser previews.
    // SidebarProvider manages the state for both desktop and mobile
    <SidebarProvider defaultOpen={false}>
        {/* The Sidebar component handles rendering the correct variant (desktop or mobile Sheet) */}
        {/* Set side back to "left" */}
        <Sidebar variant="sidebar" collapsible="icon" side="left">
          <SidebarHeader className="p-4 flex items-center justify-between group-data-[collapsible=icon]:justify-center">
             <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-sidebar-primary group-data-[collapsible=icon]:justify-center">
               <Coins className="h-7 w-7" />
               <span className="group-data-[collapsible=icon]:hidden">Pocket Budgeteer</span>
             </Link>
             {/* Optional: Add a close button specifically for the mobile sheet header if needed */}
             {/* <SidebarTrigger className="md:hidden" /> */}
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          {/* <SidebarFooter className="p-2">
             Optional footer content
          </SidebarFooter> */}
        </Sidebar>

        {/* SidebarRail is only for desktop expand/collapse visual cue */}
        <SidebarRail />

        {/* Main Content Area */}
        {/* Apply margin-left based on sidebar state for desktop */}
        <div className="flex flex-col flex-1 min-h-screen md:ml-[var(--sidebar-width-icon)] group-data-[sidebar-state=expanded]/sidebar-wrapper:md:ml-[var(--sidebar-width)] transition-[margin-left] duration-300 ease-in-out">
            <AppHeader /> {/* AppHeader contains the mobile SidebarTrigger */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30 dark:bg-background">
              {children}
            </main>
        </div>
    </SidebarProvider>
  );
}

