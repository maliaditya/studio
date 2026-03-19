"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Box,
  BrainCircuit,
  CalendarClock,
  Code2,
  CreditCard,
  Dumbbell,
  FileText,
  GitBranch,
  Grid2X2,
  HeartHandshake,
  LayoutDashboard,
  Library,
  ListChecks,
  Paintbrush,
  PenTool,
  PieChart,
  Route,
  Settings,
  Sparkles,
  Target,
  Trello,
  Wallet,
  Workflow,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label: string;
  links: NavLink[];
};

const SIMPLE_SECTIONS: NavSection[] = [
  {
    label: "Core",
    links: [
      { href: "/my-plate", label: "Dashboard", icon: LayoutDashboard },
      { href: "/resources", label: "Resources", icon: Library },
      { href: "/skill", label: "Skill Tree", icon: GitBranch },
      { href: "/kanban", label: "Kanban", icon: Trello },
      { href: "/graph", label: "Graph", icon: Workflow },
    ],
  },
  {
    label: "Strategy",
    links: [
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/strategic-planning", label: "Strategy", icon: Route },
      { href: "/support", label: "Support", icon: HeartHandshake },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/workout-tracker", label: "Workout Tracker", icon: Dumbbell },
      { href: "/timetable", label: "Timetable", icon: CalendarClock },
      { href: "/canvas", label: "Canvas", icon: Paintbrush },
    ],
  },
];

const DEFAULT_SECTIONS: NavSection[] = [
  {
    label: "Core",
    links: [
      { href: "/my-plate", label: "Dashboard", icon: LayoutDashboard },
      { href: "/resources", label: "Resources", icon: Library },
      { href: "/skill", label: "Skill Tree", icon: GitBranch },
      { href: "/kanban", label: "Kanban", icon: Trello },
    ],
  },
  {
    label: "Execution",
    links: [
      { href: "/deep-work", label: "Deep Work", icon: Target },
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/strategic-planning", label: "Strategy", icon: Route },
      { href: "/truth", label: "Truth", icon: Sparkles },
      { href: "/graph", label: "Graph", icon: Workflow },
    ],
  },
];

const MORE_SECTIONS: NavSection[] = [
  {
    label: "Training",
    links: [
      { href: "/workout-tracker", label: "Workout Tracker", icon: Dumbbell },
      { href: "/mind-programming", label: "Mind Programming", icon: BrainCircuit },
      { href: "/deep-work", label: "Deep Work", icon: Target },
      { href: "/timetable", label: "Timetable", icon: CalendarClock },
    ],
  },
  {
    label: "Growth",
    links: [
      { href: "/personal-branding", label: "Branding", icon: PenTool },
      { href: "/lead-generation", label: "Lead Gen", icon: CreditCard },
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/portfolio", label: "Portfolio", icon: Grid2X2 },
      { href: "/support", label: "Support", icon: HeartHandshake },
    ],
  },
  {
    label: "Systems",
    links: [
      { href: "/gamified-skills", label: "Gamified Skills", icon: Sparkles },
      { href: "/formalization", label: "Formalization", icon: FileText },
      { href: "/patterns", label: "Patterns", icon: PieChart },
      { href: "/purpose", label: "Purpose", icon: Target },
      { href: "/charts", label: "Charts", icon: BarChart3 },
      { href: "/timesheet", label: "Timesheet", icon: ListChecks },
    ],
  },
  {
    label: "Extras",
    links: [
      { href: "/cube", label: "3D Cube", icon: Box },
      { href: "/code-viz", label: "3D Code Viz", icon: Code2 },
      { href: "/canvas", label: "Canvas", icon: Paintbrush },
      { href: "/code-of-conduct", label: "Code of Conduct", icon: FileText },
    ],
  },
];

export function AppSidebar() {
  const { settings, currentUser, setSettings } = useAuth();
  const pathname = usePathname();
  const { state } = useSidebar();
  const simpleMode = settings.ispSimpleMode ?? true;
  const isAdminUser = (currentUser?.username || "").trim().toLowerCase() === "lonewolf";

  const baseSections = simpleMode ? SIMPLE_SECTIONS : DEFAULT_SECTIONS;
  const navSections = isAdminUser
    ? [
        ...baseSections,
        {
          label: "Admin",
          links: [
            { href: "/admin/monetization", label: "Monetization", icon: Wallet },
            { href: "/admin/config", label: "Config", icon: Settings },
          ],
        },
      ]
    : baseSections;
  const showMore = !simpleMode;

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r-0">
      <div className={state === "collapsed" ? "h-4" : "h-6"} />
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            {state !== "collapsed" && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={pathname === link.href} tooltip={link.label}>
                      <Link href={link.href} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {state !== "collapsed" && <span>{link.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {showMore && (
          <>
            <SidebarSeparator />
            {MORE_SECTIONS.map((section) => (
              <SidebarGroup key={section.label}>
                {state !== "collapsed" && (
                  <SidebarGroupLabel className="text-[11px] tracking-wide uppercase">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu>
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton asChild isActive={pathname === link.href} tooltip={link.label}>
                          <Link href={link.href} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {state !== "collapsed" && <span>{link.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 text-xs text-muted-foreground">
        {state !== "collapsed" && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">View Mode</p>
            <Select
              value={simpleMode ? "simple" : "full"}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, ispSimpleMode: value === "simple" }))
              }
            >
            <SelectTrigger className="h-8 border-0 bg-transparent px-2 shadow-none ring-0 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple Mode</SelectItem>
                <SelectItem value="full">Full Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
