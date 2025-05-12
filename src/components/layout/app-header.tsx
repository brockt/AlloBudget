
"use client";

import Link from "next/link";
import { Coins, Settings } from "lucide-react"; // Added Settings icon
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <Link href="/dashboard" className="flex items-center space-x-2 text-lg font-bold text-primary">
            <Coins className="h-7 w-7" />
            <span className="hidden sm:inline-block">Pocket Budgeteer</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Manage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/dashboard/accounts" passHref>
                <DropdownMenuItem>Accounts</DropdownMenuItem>
              </Link>
               {/* Assuming an envelopes page will exist */}
              <Link href="/dashboard/envelopes" passHref>
                <DropdownMenuItem>Envelopes</DropdownMenuItem>
              </Link>
              <Link href="/dashboard/transactions" passHref>
                <DropdownMenuItem>Transactions</DropdownMenuItem>
              </Link>
              {/* Assuming a payees page will exist */}
              <Link href="/dashboard/payees" passHref> 
                 <DropdownMenuItem disabled>Payees (Coming Soon)</DropdownMenuItem> 
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          {/* User profile/actions could go here */}
        </div>
      </div>
    </header>
  );
}
