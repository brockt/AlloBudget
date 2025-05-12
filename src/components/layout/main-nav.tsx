
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation"; // Keep usePathname
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
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
     if (isMobile) {
      setOpenMobile(false); // Close mobile sidebar after navigation link is clicked
    }
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          {/* SidebarMenuButton handles its own Tooltip internally via the tooltip prop */}
          <SidebarMenuButton
            asChild // Pass props down to the Link component
            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            tooltip={{ children: item.label, side: "right", align: "center" }} // Configure the tooltip here
            className="justify-start"
          >
            {/* Link renders the underlying <a> tag */}
            <Link href={item.href} onClick={handleLinkClick}>
              {/* Content goes inside the Link */}
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

