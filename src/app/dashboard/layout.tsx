
"use client";

import type { ReactNode } from 'react';
import { Coins } from "lucide-react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent,
  SidebarFooter,
  SidebarInset, // Renamed from SidebarMainContent to SidebarInset based on ui/sidebar.tsx
  SidebarRail
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from '@/components/ui/button'; // For potential footer actions
import Link from 'next/link';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
        <Sidebar variant="sidebar" collapsible="icon" side="left">
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
        <SidebarRail /> 
        <div className="flex flex-col flex-1 min-h-screen">
            <AppHeader />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30 dark:bg-background">
              {children}
            </main>
        </div>
    </SidebarProvider>
  );
}
