"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Search,
  BarChart3,
  BadgePlus,
  LandPlot,
  RefreshCcw,
  ClipboardCheck,
  Map,
  Files,
  Activity,
  ScrollText,
  PieChart,
  Scale,
  LineChart,
  Landmark,
  User,
  Users,
  Database,
  ChevronUp,
  Settings,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { LucideIcon } from "lucide-react"

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

const ALL_NAV_ITEMS: Record<string, NavItem> = {
  SEARCH: { name: "Search", href: "/dashboard/search", icon: Search, exact: true },
  OVERVIEW: { name: "Overview", href: "/dashboard", icon: BarChart3, exact: true },
  MARKETPLACE: { name: "Marketplace", href: "/dashboard/marketplace", icon: Landmark, exact: false },
  REGISTRATION: { name: "Registration", href: "/dashboard/registration", icon: BadgePlus },
  LAND_RECORDS: { name: "Land Records", href: "/dashboard/land-records", icon: LandPlot },
  TRANSFER_REQUESTS: { name: "Transfer Requests", href: "/dashboard/transfer-requests", icon: RefreshCcw },
  VERIFICATION_CASES: { name: "Assigned Verification Cases", href: "/dashboard/verification-cases", icon: ClipboardCheck },
  FIELD_TASKS: { name: "Field Tasks", href: "/dashboard/field-tasks", icon: Map },
  ALL_APPLICATIONS: { name: "All Applications", href: "/dashboard/applications", icon: Files },
  CASE_ACTIVITY_LOGS: { name: "Case Activity Logs", href: "/dashboard/case-logs", icon: Activity },
  LOGS: { name: "Logs", href: "/dashboard/logs", icon: ScrollText },
  APPROVAL_STATS: { name: "Approval Statistics", href: "/dashboard/approval-stats", icon: PieChart },
  DISPUTE_CASES: { name: "Dispute Cases", href: "/dashboard/disputes", icon: Scale },
  LAND_ANALYTICS: { name: "Land Analytics", href: "/dashboard/land-analytics", icon: LineChart },
  ALL_LAND_RECORDS: { name: "All Land Records", href: "/dashboard/all-land-records", icon: Database },
  USERS: { name: "Users", href: "/dashboard/users", icon: Users },
}

type Role = "CITIZEN" | "REVENUE_INSPECTOR" | "ADDITIONAL_TAHASILDAR" | "TAHASILDAR" | "COLLECTOR" | "ADMIN"

const ROLE_NAV_MAPPING: Record<Role, (keyof typeof ALL_NAV_ITEMS)[]> = {
  CITIZEN: ["SEARCH", "OVERVIEW", "MARKETPLACE", "REGISTRATION", "LAND_RECORDS", "TRANSFER_REQUESTS"],
  REVENUE_INSPECTOR: ["OVERVIEW", "MARKETPLACE", "VERIFICATION_CASES", "FIELD_TASKS","REGISTRATION", "LAND_RECORDS", "ALL_LAND_RECORDS"],
  ADDITIONAL_TAHASILDAR: ["OVERVIEW", "MARKETPLACE", "VERIFICATION_CASES", "ALL_APPLICATIONS","REGISTRATION", "LAND_RECORDS", "ALL_LAND_RECORDS", "CASE_ACTIVITY_LOGS", "USERS"],
  TAHASILDAR: ["OVERVIEW", "MARKETPLACE", "VERIFICATION_CASES", "ALL_APPLICATIONS","REGISTRATION", "LAND_RECORDS", "ALL_LAND_RECORDS", "LOGS", "USERS"],
  COLLECTOR: ["OVERVIEW", "MARKETPLACE", "APPROVAL_STATS", "ALL_APPLICATIONS","REGISTRATION", "LAND_RECORDS", "ALL_LAND_RECORDS", "LOGS", "DISPUTE_CASES", "LAND_ANALYTICS", "USERS"],
  ADMIN: [
    "SEARCH", "OVERVIEW", "MARKETPLACE", "REGISTRATION", "LAND_RECORDS", "TRANSFER_REQUESTS",
    "VERIFICATION_CASES", "FIELD_TASKS", "ALL_APPLICATIONS", "ALL_LAND_RECORDS", "CASE_ACTIVITY_LOGS",
    "LOGS", "APPROVAL_STATS", "DISPUTE_CASES", "LAND_ANALYTICS", "USERS"
  ],
}

const ROLE_LABELS: Record<string, string> = {
  CITIZEN: "Citizen",
  REVENUE_INSPECTOR: "Revenue Inspector",
  ADDITIONAL_TAHASILDAR: "Addl. Tahasildar",
  TAHASILDAR: "Tahasildar",
  COLLECTOR: "Collector",
  ADMIN: "Admin",
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const userRole = (user?.role as Role) || "CITIZEN"
  const userNavKeys = ROLE_NAV_MAPPING[userRole] || ROLE_NAV_MAPPING.CITIZEN
  const navigationItems = userNavKeys.map(key => ALL_NAV_ITEMS[key])

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-gray-200 bg-white data-[variant=inset]:min-h-[calc(100vh-(--spacing(4)))] md:data-[variant=inset]:m-2 md:data-[variant=inset]:ml-0 md:data-[variant=inset]:rounded-xl md:data-[variant=inset]:shadow-md"
    >
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <Link href="/" target="_blank" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Landmark className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold text-gray-900">BhuSetu</span>
          </Link>
          <SidebarTrigger className="h-8 w-8 hover:bg-blue-50 transition-colors duration-200 -m-2 max-lg:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"))}
                    tooltip={item.name}
                    className="transition-all duration-200 hover:bg-blue-50 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      <span className="transition-opacity duration-200">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {user?.name || user?.email?.split('@')[0] || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : 'Guest'}
                      </span>
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}