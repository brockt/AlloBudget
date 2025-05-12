
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  const { setOpenMobile, isMobile, openMobile } = useSidebar();

  // Close mobile sidebar on route change if it was open
  useEffect(() => {
    if (isMobile && openMobile) {
      // This effect handles closing if the route changes *while* the mobile menu is open.
      // The onClick below handles closing *upon* clicking a link.
    }
  }, [pathname, isMobile, openMobile]); // Removed setOpenMobile from deps as it's stable

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, side: "right", align: "center" }}
            className="justify-start" // Ensures text starts left
             // Removed the complex onClick logic here - Link handles navigation
             // The sidebar closing logic will be managed by the Link's click propagation
             // to the parent Sheet/Dialog component in mobile view, or remain open on desktop.
          >
             {/* The Link component wraps the visual button content */}
            <Link href={item.href} onClick={() => {
                // Explicitly close mobile sidebar on *any* click
                if (isMobile) {
                  setOpenMobile(false);
                }
            }}>
              <item.icon className="h-5 w-5" />
              {/* Ensure text span is correctly controlled by group state */}
              <span className="group-data-[collapsible=icon]:hidden ml-2"> {/* Added margin */}
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
