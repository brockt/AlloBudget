
"use client";

import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarRail
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { AppHeader } from "@/components/layout/app-header";
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard'; // Import AuthGuard

// Custom SVG Logo component (same as in AppHeader)
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard> {/* Wrap with AuthGuard */}
      <SidebarProvider defaultOpen={false}>
          <Sidebar variant="sidebar" collapsible="icon" side="left">
            <SidebarHeader className="p-4 flex items-center justify-between group-data-[collapsible=icon]:justify-center">
               <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-sidebar-primary group-data-[collapsible=icon]:justify-center">
                 <AlloBudgetLogo className="h-7 w-7" />
                 <span className="group-data-[collapsible=icon]:hidden">AlloBudget</span>
               </Link>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
          </Sidebar>

          <SidebarRail />

          <div className="flex flex-col flex-1 min-h-screen md:ml-[var(--sidebar-width-icon)] group-data-[sidebar-state=expanded]/sidebar-wrapper:md:ml-[var(--sidebar-width)] transition-[margin-left] duration-300 ease-in-out">
              <AppHeader />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/30 dark:bg-background">
                {children}
              </main>
          </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
