
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent as RadixSheetContent, SheetHeader as RadixUiSheetHeader, SheetTitle as RadixUiSheetTitle } from "@/components/ui/sheet" // Use renamed SheetContent alias
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem" // Width when collapsed to icons
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((prevState: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (open: boolean | ((prevState: boolean) => boolean)) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = false, // Default to false as set in layout
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false); // Mobile state separate

    // Initialize desktop state with defaultOpen
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open // Use controlled prop if available

    // Client-side effect to read cookie and potentially override initial state
    React.useEffect(() => {
        // Only run this on the client and if the component is uncontrolled
        if (typeof window !== "undefined" && openProp === undefined) {
            const cookieValue = document.cookie
                .split("; ")
                .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
                ?.split("=")[1];

            // Only update state if cookie exists and its value differs from the current state
            if (cookieValue !== undefined) {
                const cookieOpenState = cookieValue === "true";
                if (cookieOpenState !== _open) {
                     // console.log(`Client mount: Cookie found (${cookieValue}), setting desktop state to ${cookieOpenState}`);
                    _setOpen(cookieOpenState);
                }
            }
            // Ensure state matches defaultOpen if no cookie or component is uncontrolled initially
            else if (_open !== defaultOpen) {
               // console.log(`Client mount: No cookie, ensuring state matches defaultOpen (${defaultOpen})`);
               _setOpen(defaultOpen);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openProp, defaultOpen]); // Rerun if defaultOpen changes (though unlikely)

    // Callback to set desktop state and update cookie
    const setOpen = React.useCallback(
      (value: boolean | ((prevState: boolean) => boolean)) => {
        const newOpenState = typeof value === "function" ? value(open) : value
        // console.log(`Setting desktop sidebar state: ${newOpenState}`);
        if (setOpenProp) {
          setOpenProp(newOpenState)
        } else {
          _setOpen(newOpenState)
        }
        if (typeof window !== "undefined") {
          // console.log(`Setting cookie ${SIDEBAR_COOKIE_NAME} to ${newOpenState}`);
          document.cookie = `${SIDEBAR_COOKIE_NAME}=${newOpenState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
        }
      },
      [setOpenProp, open]
    )

    // Toggle function for both mobile and desktop
    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        // console.log("Toggling mobile sidebar");
        setOpenMobile((current) => !current) // Toggle mobile state
      } else {
        // console.log("Toggling desktop sidebar");
        setOpen((current) => !current) // Toggle desktop state (uses the setOpen that updates cookie)
      }
    }, [isMobile, setOpen, setOpenMobile])

    // Keyboard shortcut
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          // console.log("Keyboard shortcut triggered");
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // Derive desktop state ('expanded'/'collapsed') from the 'open' state variable
    const state = open ? "expanded" : "collapsed"
    // console.log(`Current sidebar state: Desktop=${state}, MobileOpen=${openMobile}`);

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state, // Desktop state
        open,  // Desktop open state
        setOpen, // Desktop setter (updates cookie)
        isMobile,
        openMobile, // Mobile open state
        setOpenMobile, // Mobile setter (no cookie needed)
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            // Add data attribute reflecting desktop state for layout adjustment
            data-sidebar-state={state}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(
  (
    {
      side = "left", // Default back to left
      variant = "sidebar",
      collapsible = "icon", // Default back to icon collapse
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    if (collapsible === "none") {
      // Non-collapsible variant remains simple
      return (
        <div
          className={cn(
            "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
            side === 'left' ? 'border-r' : 'border-l', // Add border based on side
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }

    if (isMobile) {
      // Mobile view uses Sheet, controlled by `openMobile` state
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          {/* Ensure SheetContent uses the alias and has correct styling */}
          <RadixSheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className={cn(
              "w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground flex flex-col", // Base mobile styles + flex column
               "sm:max-w-sm", // From original SheetContent variants
               className // Allow overrides
              )}
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side} // Use the side prop for the Sheet
          >
            {/* SheetHeader and Title are good for accessibility */}
            <RadixUiSheetHeader className="sr-only">
              <RadixUiSheetTitle>Navigation Menu</RadixUiSheetTitle>
            </RadixUiSheetHeader>
            {/* Remove the extra div, SheetContent is already the flex container */}
            {children}
          </RadixSheetContent>
        </Sheet>
      )
    }

    // Desktop view uses the div structure controlled by `state` (derived from `open`)
    return (
      <div
        ref={ref}
        className={cn(
          "group peer hidden md:block text-sidebar-foreground fixed inset-y-0 z-40 transition-[width] duration-300 ease-in-out", // Use fixed positioning
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l', // Position based on side, add border
          state === 'expanded' ? 'w-[--sidebar-width]' : 'w-[--sidebar-width-icon]', // Width based on state
          collapsible === 'offcanvas' && state === 'collapsed' && (side === 'left' ? '-translate-x-full' : 'translate-x-full'), // Offcanvas hidden state
          // Floating/Inset are not used currently, keeping base logic
          className
        )}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        {...props}
      >
        {/* No extra div needed for gap/spacer */}
        {/* Inner container for styling (bg, border, shadow) */}
        <div
          data-sidebar="sidebar"
          className={cn(
              "flex h-full w-full flex-col bg-sidebar",
              // variant === "floating" ? "rounded-lg border border-sidebar-border shadow" : "",
              // variant === "inset" is handled by parent div styles usually
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)} // Adjusted size for consistency
      onClick={(event) => {
        // console.log("SidebarTrigger clicked");
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

// SidebarRail might not be needed if the main content adjusts margin based on state
const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex",
        // Adjust positioning based on side
        "group-data-[side=left]/sidebar-wrapper:left-[var(--sidebar-width-icon)] group-data-[state=expanded]/sidebar-wrapper:group-data-[side=left]/sidebar-wrapper:left-[var(--sidebar-width)]",
        "group-data-[side=right]/sidebar-wrapper:right-[var(--sidebar-width-icon)] group-data-[state=expanded]/sidebar-wrapper:group-data-[side=right]/sidebar-wrapper:right-[var(--sidebar-width)]",

        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize", // This seems reversed, should be e-resize for left, w-resize for right? Let's correct
        "[[data-side=left]_&]:cursor-e-resize [[data-side=right]_&]:cursor-w-resize",

        // Collapsed state resize direction
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", // Stays the same for collapsed

        // Offcanvas specific styles might need adjustment if used
        // "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        // "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        // "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"


const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        // Adjust margin based on sidebar state and side (if using inset)
        "md:peer-data-[side=left]:peer-data-[variant=inset]:ml-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]",
        "md:peer-data-[side=left]:peer-data-[state=expanded]:peer-data-[variant=inset]:ml-[calc(var(--sidebar-width)_+_theme(spacing.4))]",
        "md:peer-data-[side=right]:peer-data-[variant=inset]:mr-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]",
        "md:peer-data-[side=right]:peer-data-[state=expanded]:peer-data-[variant=inset]:mr-[calc(var(--sidebar-width)_+_theme(spacing.4))]",
        // Base inset styles
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",

        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"


const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("mt-auto flex flex-col gap-2 p-2", className)} // Added mt-auto
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"


const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto", // Removed icon specific overflow hidden
        "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:overflow-hidden", // Apply overflow hidden only when collapsed *and* collapsible is icon
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"


const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
         "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:-mt-8 group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:opacity-0", // Hide when icon collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden", // Hide when icon collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1 p-2", className)} // Added padding for breathing room
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground", // Base styles
  "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:size-8 group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:p-1.5 group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:justify-center", // Icon collapsed styles
  "[&>span:last-child]:group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden", // Hide text when icon collapsed
  "[&>svg]:size-4 [&>svg]:shrink-0", // Icon styles
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-9 text-sm", // Adjusted height
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:size-12 group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:p-0", // Adjusted icon-only size/padding
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


const SidebarMenuButton = React.forwardRef<
  // The element type depends on asChild. It could be button or the child's type.
  // We'll use HTMLButtonElement as a base, but acknowledge it might change.
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      children,
      onClick, // Capture onClick
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state, setOpenMobile } = useSidebar(); // Get context

    const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        // console.log(`SidebarMenuButton clicked. isMobile: ${isMobile}`);
        if (isMobile) {
            // console.log("Closing mobile sidebar due to menu item click");
            setOpenMobile(false); // Close mobile sheet on click
        }
        onClick?.(event); // Call original onClick if provided
    };

    const buttonContent = (
        <Comp
            ref={ref}
            data-sidebar="menu-button"
            data-size={size}
            data-active={isActive}
            className={cn(sidebarMenuButtonVariants({ variant, size, className }))}
            onClick={handleClick} // Use the combined click handler
            {...props}
        >
            {children}
        </Comp>
    );

    // Show tooltip only when sidebar is collapsed to icon state on desktop
    if (!tooltip || (state === "expanded" && !isMobile)) {
        return buttonContent;
    }

    let tooltipProps: React.ComponentProps<typeof TooltipContent>;
    if (typeof tooltip === "string") {
      tooltipProps = { children: tooltip };
    } else {
      tooltipProps = tooltip;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent
          side="right" // Tooltip should appear to the right for left sidebar
          align="center"
          {...tooltipProps}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"


const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden", // Hide when icon collapsed
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
       "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden", // Hide when icon collapsed
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width] group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden" // Hide text skeleton when icon collapsed
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden", // Hide when icon collapsed
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  // Can be 'a' or Slot child
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a" // Default is 'a'

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[state=collapsed]/sidebar-wrapper:group-data-[collapsible=icon]/sidebar-wrapper:hidden", // Hide when icon collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
