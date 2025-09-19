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
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const getItemDescription = (title: string) => {
  const descriptions: Record<string, string> = {
    "Dashboard": "Main overview and analytics",
    "X Platform": "Advanced trading platform",
    "X1 System": "AI-powered trading system",
    "X2 Advanced": "Advanced analytics tools",
    "Original AI": "Core AI trading engine",
    "Trade": "Execute trading operations",
    "Portfolio": "Portfolio management",
    "Signals": "Trading signals and alerts",
    "Markets": "Market data and analysis",
    "Backtests": "Strategy testing tools",
    "Automation": "Automated trading setup",
    "Alerts": "Notification management",
    "Settings": "Application preferences"
  };
  return descriptions[title] || "Navigation item";
};

export function AppSidebar() {
  const { state, openMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary border-l-2 border-primary font-medium" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      className="w-80"
      collapsible="none"
      side="right"
    >
      <SidebarContent className="border-l border-border">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold brand-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
                AItradeX
              </h1>
              <p className="text-xs text-muted-foreground truncate">AI-Powered Trading</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={`${getNavCls({ isActive: isActive(item.url) })} rounded-lg mx-2 transition-colors p-3 flex items-center gap-3`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {getItemDescription(item.title)}
                        </span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup className="mt-auto border-t border-border pt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={`${getNavCls({ isActive: isActive(item.url) })} rounded-lg mx-2 transition-colors p-3 flex items-center gap-3`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {getItemDescription(item.title)}
                        </span>
                      </div>
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