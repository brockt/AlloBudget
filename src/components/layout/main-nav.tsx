
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  BarChart3,
  Users,
  Package, // Changed Landmark to Package for Envelopes
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, // Import the useSidebar hook
} from "@/components/ui/sidebar";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Accounts", icon: Landmark },
  { href: "/dashboard/envelopes", label: "Envelopes", icon: Package }, // Updated icon
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/dashboard/payees", label: "Payees", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export function MainNav() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar(); // Get mobile state and setter

  const handleLinkClick = () => {
    // Check if it's mobile and the function exists before calling
    if (isMobile && typeof setOpenMobile === 'function') {
      setOpenMobile(false); // Close mobile sidebar on link click
    }
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {/* Apply onClick directly to Link component */}
          <Link href={item.href}
                legacyBehavior
                passHref
                onClick={handleLinkClick}
          >
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              className="justify-start"
              // onClick handler removed from here, handled by Link now
            >
              <a>
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {item.label}
                </span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

