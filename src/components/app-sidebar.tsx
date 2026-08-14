import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Settings as SettingsIcon,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Lessons / Materials", url: "/lessons", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Learning Progress", url: "/progress", icon: TrendingUp },
  { title: "Levels", url: "/levels", icon: Layers },
  { title: "Monthly Reports", url: "/reports", icon: FileBarChart },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">EasySpeak</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">Teacher Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                  >
                    <Link
                      to={item.url}
                      className="flex items-center gap-3"
                      onClick={isMobile ? () => setOpenMobile(false) : undefined}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="px-4 py-3 text-[11px] leading-relaxed text-sidebar-foreground/50">
          Attendance • Progress • Projects • Reports
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
