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
  const { isMobile, setOpenMobile } = useSidebar(); // Get isMobile and setOpenMobile

  // // Effect to close mobile menu on route change (rely on Sheet's internal behavior first)
  // useEffect(() => {
  //   if (isMobile) {
  //     // console.log("Route changed, closing mobile menu if open");
  //     // setOpenMobile(false); // Re-enable if Sheet doesn't close automatically
  //   }
  // }, [pathname, isMobile, setOpenMobile]);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {/* SidebarMenuButton now wraps the Link and handles the click */}
          <SidebarMenuButton
            asChild // Important: This tells the button to render its child (Link) instead of a <button>
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, side: "right", align: "center" }}
            className="justify-start"
             // onClick handler is now inside SidebarMenuButton and calls setOpenMobile(false) if mobile
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden ml-2">
                {item.label}
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}