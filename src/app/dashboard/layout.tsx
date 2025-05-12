
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
  SidebarRail
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { AppHeader } from "@/components/layout/app-header";
// import { Button } from '@/components/ui/button'; // For potential footer actions
import Link from 'next/link';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    // Set defaultOpen to false to start with a collapsed sidebar on desktop
    <SidebarProvider defaultOpen={false}>
        <Sidebar variant="sidebar" collapsible="icon" side="right">
          <SidebarHeader className="p-4 items-center justify-center group-data-[collapsible=icon]:justify-start">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-sidebar-primary group-data-[collapsible=icon]:justify-center">
              <Coins className="h-7 w-7" />
              <span className="group-data-[collapsible=icon]:hidden">Pocket Budgeteer</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          {/* <SidebarFooter className="p-2">
             Optional footer content
          </SidebarFooter> */}
        </Sidebar>
        <SidebarRail /> {/* This is the toggle for desktop sidebar */}
        <div className="flex flex-col flex-1 min-h-screen">
            <AppHeader />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30 dark:bg-background">
              {children}
            </main>
        </div>
    </SidebarProvider>
  );
}

