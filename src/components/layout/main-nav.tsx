"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Import useRouter
import {
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  BarChart3,
  Users,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Accounts", icon: Landmark },
  { href: "/dashboard/envelopes", label: "Envelopes", icon: Package },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/dashboard/payees", label: "Payees", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter(); // Initialize useRouter
  const { setOpenMobile, isMobile } = useSidebar();

  const handleItemClick = (href: string) => {
    router.push(href); // Navigate programmatically
    if (isMobile) {
      setOpenMobile(false); // Close mobile sidebar after navigation initiated
    }
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {/* SidebarMenuButton handles the click and navigation */}
          <SidebarMenuButton
            onClick={() => handleItemClick(item.href)}
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, side: "right", align: "center" }}
            className="justify-start"
            // asChild is not needed here as we are not wrapping a Link
          >
            <item.icon className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden">
              {item.label}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}