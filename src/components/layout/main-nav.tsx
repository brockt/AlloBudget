"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react"; // Import useEffect
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
  // Get openMobile state as well for the useEffect dependency
  const { setOpenMobile, isMobile, openMobile } = useSidebar(); 

  // Close mobile sidebar on route change if it was open
  useEffect(() => {
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
    // Add all relevant dependencies for the effect
  }, [pathname, isMobile, openMobile, setOpenMobile]);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, side: "right", align: "center" }}
            className="justify-start"
            onClick={() => { 
              // Attempt to close immediately on click for better responsiveness
              if (isMobile) {
                setOpenMobile(false); 
              }
              // Link component will handle navigation
            }}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}