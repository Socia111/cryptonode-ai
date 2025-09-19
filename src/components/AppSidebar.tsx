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

// Enhanced menu items with colors and better organization
const mainItems = [
  { title: "🏠 Dashboard", url: "/", icon: Home, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { title: "📊 Live Signals", url: "/signals", icon: Zap, color: "text-green-500", bgColor: "bg-green-500/10" },
  { title: "📈 All Signals", url: "/all-signals", icon: Activity, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { title: "🎯 AItradeX1", url: "/aitradex1", icon: Target, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { title: "💰 Trade", url: "/trade", icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  { title: "💼 Portfolio", url: "/portfolio", icon: Wallet, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  { title: "🚀 X Platform", url: "/x", icon: TrendingUp, color: "text-red-500", bgColor: "bg-red-500/10" },
  { title: "⚡ X1 System", url: "/x1", icon: BarChart3, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  { title: "🔥 X2 Advanced", url: "/x2", icon: PieChart, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { title: "💎 Unireli Core", url: "/UNIRELIORIGINAL", icon: Zap, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
  { title: "📊 Markets", url: "/markets", icon: BarChart3, color: "text-blue-600", bgColor: "bg-blue-600/10" },
  { title: "🧪 Backtests", url: "/backtests", icon: TestTube, color: "text-teal-500", bgColor: "bg-teal-500/10" },
  { title: "🤖 Automation", url: "/automation", icon: Bot, color: "text-violet-500", bgColor: "bg-violet-500/10" },
  { title: "🔔 Alerts", url: "/alerts", icon: Bell, color: "text-amber-500", bgColor: "bg-amber-500/10" },
];

const settingsItems = [
  { title: "⚙️ Settings", url: "/settings", icon: Settings, color: "text-gray-500", bgColor: "bg-gray-500/10" },
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
      className={collapsed ? "w-20" : "w-80"}
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
                      className={`${getNavCls({ isActive: isActive(item.url) }, item)} rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:translate-x-1`}
                    >
                      <item.icon className="w-6 h-6 shrink-0" />
                      {!collapsed && <span className="truncate font-medium">{item.title}</span>}
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
                      className={`${getNavCls({ isActive: isActive(item.url) }, item)} rounded-xl p-4 transition-all duration-300 hover:scale-105`}
                    >
                      <item.icon className="w-6 h-6 shrink-0" />
                      {!collapsed && <span className="truncate font-medium">{item.title}</span>}
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