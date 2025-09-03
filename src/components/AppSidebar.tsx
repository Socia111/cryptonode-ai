import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Wallet, 
  Zap, 
  PieChart, 
  TestTube, 
  Bot, 
  Bell, 
  Settings,
  Home,
  Building2
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "X Platform", url: "/x", icon: TrendingUp },
  { title: "X1 System", url: "/x1", icon: BarChart3 },
  { title: "X2 Advanced", url: "/x2", icon: PieChart },
  { title: "Original AI", url: "/AITRADEX1ORIGINAL", icon: Zap },
  { title: "Trade", url: "/trade", icon: TrendingUp },
  { title: "Portfolio", url: "/portfolio", icon: Wallet },
  { title: "Signals", url: "/signals", icon: Zap },
  { title: "Markets", url: "/markets", icon: BarChart3 },
  { title: "Backtests", url: "/backtests", icon: TestTube },
  { title: "Automation", url: "/automation", icon: Bot },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Bybit Login", url: "/bybit-auth", icon: Building2 },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, openMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="border-r border-border">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold brand-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  AItradeX
                </h1>
                <p className="text-xs text-muted-foreground">AI-Powered Trading</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={getNavCls({ isActive: isActive(item.url) })}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={getNavCls({ isActive: isActive(item.url) })}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}