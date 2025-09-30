import { useState } from "react";
import { 
  Activity,
  Building2,
  Signal,
  ShoppingCart,
  Shield
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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
  { title: "Dashboard", url: "/", icon: Activity, description: "System overview and monitoring", badge: "Live" },
  { title: "Connect API", url: "/api", icon: Building2, description: "Connect your trading account" },
  { title: "Signals", url: "/signals", icon: Signal, description: "AI trading signals feed" },
  { title: "Buy", url: "/buy", icon: ShoppingCart, description: "Execute trades" },
];

export function AppSidebar() {
  const { state } = useSidebar();
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

  const SidebarNavItem = ({ item }: { item: any }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink 
          to={item.url} 
          end={item.url === "/"}
          className={`${getNavCls({ isActive: isActive(item.url) })} rounded-lg mx-2 transition-colors p-3 flex items-center gap-3`}
        >
          <item.icon className="w-5 h-5 shrink-0" />
          <div className="flex flex-col items-start flex-1 min-w-0">
            <div className="flex items-center justify-between w-full">
              <span className="font-medium text-sm truncate">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                  {item.badge}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate w-full">
              {item.description}
            </span>
          </div>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

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
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                AItradeX1
              </h1>
              <p className="text-xs text-muted-foreground truncate">AI-Powered Trading Platform</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarNavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Footer Status */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>System Online</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Secure</span>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}