
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

  // This effect can still be useful if direct URL changes happen while mobile menu is open
  useEffect(() => {
    if (isMobile && openMobile) {
      // Potentially close on route change if needed, but rely on Sheet behavior first.
      // setOpenMobile(false); // Consider removing or commenting this out if Sheet handles it
    }
  }, [pathname, isMobile, openMobile, setOpenMobile]); // Added setOpenMobile to dependencies

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, side: "right", align: "center" }}
            className="justify-start"
            // Removed the explicit onClick={...} from SidebarMenuButton
          >
            {/* The Link component wraps the visual button content */}
            {/* Removed the onClick from Link as well. Rely on Sheet's internal close triggers. */}
            <Link href={item.href} >
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
