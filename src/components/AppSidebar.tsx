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
  Building2,
  Activity,
  Target
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

// Enhanced menu items with bigger icons and clear descriptions
const mainItems = [
  { 
    title: "Dashboard", 
    description: "Main overview and system status",
    url: "/", 
    icon: Home, 
    color: "text-blue-600", 
    bgColor: "bg-blue-500/10" 
  },
  { 
    title: "Live Signals", 
    description: "Real-time trading signals feed",
    url: "/signals", 
    icon: Zap, 
    color: "text-green-600", 
    bgColor: "bg-green-500/10" 
  },
  { 
    title: "All Signals", 
    description: "Complete signals history and analysis",
    url: "/all-signals", 
    icon: Activity, 
    color: "text-purple-600", 
    bgColor: "bg-purple-500/10" 
  },
  { 
    title: "AItradeX1", 
    description: "Advanced AI trading system",
    url: "/aitradex1", 
    icon: Target, 
    color: "text-orange-600", 
    bgColor: "bg-orange-500/10" 
  },
  { 
    title: "Trade", 
    description: "Live trading interface",
    url: "/trade", 
    icon: TrendingUp, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-500/10" 
  },
  { 
    title: "Portfolio", 
    description: "Account balance and positions",
    url: "/portfolio", 
    icon: Wallet, 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-500/10" 
  },
  { 
    title: "X Platform", 
    description: "Extended trading platform",
    url: "/x", 
    icon: TrendingUp, 
    color: "text-red-600", 
    bgColor: "bg-red-500/10" 
  },
  { 
    title: "X1 System", 
    description: "Primary trading system",
    url: "/x1", 
    icon: BarChart3, 
    color: "text-yellow-600", 
    bgColor: "bg-yellow-500/10" 
  },
  { 
    title: "X2 Advanced", 
    description: "Advanced trading features",
    url: "/x2", 
    icon: PieChart, 
    color: "text-pink-600", 
    bgColor: "bg-pink-500/10" 
  },
  { 
    title: "Unireli Core", 
    description: "Core Unireli trading engine",
    url: "/UNIRELIORIGINAL", 
    icon: Zap, 
    color: "text-indigo-600", 
    bgColor: "bg-indigo-500/10" 
  },
  { 
    title: "Markets", 
    description: "Market data and analysis",
    url: "/markets", 
    icon: BarChart3, 
    color: "text-blue-700", 
    bgColor: "bg-blue-600/10" 
  },
  { 
    title: "Backtests", 
    description: "Strategy testing and validation",
    url: "/backtests", 
    icon: TestTube, 
    color: "text-teal-600", 
    bgColor: "bg-teal-500/10" 
  },
  { 
    title: "Automation", 
    description: "Automated trading settings",
    url: "/automation", 
    icon: Bot, 
    color: "text-violet-600", 
    bgColor: "bg-violet-500/10" 
  },
  { 
    title: "Alerts", 
    description: "Notifications and alerts",
    url: "/alerts", 
    icon: Bell, 
    color: "text-amber-600", 
    bgColor: "bg-amber-500/10" 
  },
];

const settingsItems = [
  { 
    title: "Settings", 
    description: "System configuration and preferences",
    url: "/settings", 
    icon: Settings, 
    color: "text-gray-600", 
    bgColor: "bg-gray-500/10" 
  },
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

  const getNavCls = ({ isActive }: { isActive: boolean }, item: any) =>
    isActive 
      ? `${item.bgColor} ${item.color} border-l-4 border-current font-bold text-base shadow-lg` 
      : `hover:${item.bgColor} hover:${item.color} text-muted-foreground hover:text-foreground text-base hover:font-semibold transition-all duration-200 hover:shadow-md`;

  return (
    <Sidebar
      className={collapsed ? "w-24" : "w-96"}
      collapsible="icon"
      side="left"
    >
      <SidebarContent className="border-r border-border bg-gradient-to-b from-background to-secondary/5">
        {/* Enhanced Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-2xl font-bold brand-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
                  Unireli Pro
                </h1>
                <p className="text-sm text-muted-foreground truncate font-medium">Advanced Trading Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Navigation Menu */}
        <SidebarGroup className="flex-1 px-3 py-4">
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-lg font-bold text-primary mb-4"}>
            🚀 Trading Features
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={`${getNavCls({ isActive: isActive(item.url) }, item)} rounded-xl p-5 transition-all duration-300 hover:scale-105 hover:translate-x-1 min-h-[80px] flex flex-col items-start justify-center`}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <item.icon className="w-8 h-8 shrink-0" />
                        {!collapsed && (
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="font-bold text-lg truncate w-full">{item.title}</span>
                            <span className="text-xs text-muted-foreground truncate w-full leading-tight">{item.description}</span>
                          </div>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Enhanced Settings Section */}
        <SidebarGroup className="mt-auto border-t border-border pt-4 px-3 pb-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                      to={item.url}
                      className={`${getNavCls({ isActive: isActive(item.url) }, item)} rounded-xl p-5 transition-all duration-300 hover:scale-105 min-h-[80px] flex flex-col items-start justify-center`}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <item.icon className="w-8 h-8 shrink-0" />
                        {!collapsed && (
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="font-bold text-lg truncate w-full">{item.title}</span>
                            <span className="text-xs text-muted-foreground truncate w-full leading-tight">{item.description}</span>
                          </div>
                        )}
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