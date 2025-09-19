import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Activity, 
  Zap, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  PieChart, 
  TestTube, 
  Bot, 
  Bell, 
  Settings,
  Target,
  Building2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  badge?: string;
  category: 'main' | 'trading' | 'tools' | 'settings';
}

const navigationItems: NavigationItem[] = [
  // Main Section
  { 
    id: 'dashboard',
    title: "Dashboard", 
    description: "Main overview & system status",
    url: "/", 
    icon: Home, 
    color: "text-blue-600", 
    bgColor: "bg-blue-500/20",
    category: 'main'
  },
  { 
    id: 'signals',
    title: "Live Signals", 
    description: "Real-time trading signals",
    url: "/signals", 
    icon: Zap, 
    color: "text-green-600", 
    bgColor: "bg-green-500/20",
    badge: "LIVE",
    category: 'main'
  },
  { 
    id: 'all-signals',
    title: "All Signals", 
    description: "Complete signals history",
    url: "/all-signals", 
    icon: Activity, 
    color: "text-purple-600", 
    bgColor: "bg-purple-500/20",
    category: 'main'
  },

  // Trading Section
  { 
    id: 'trade',
    title: "Live Trading", 
    description: "Execute trades in real-time",
    url: "/trade", 
    icon: TrendingUp, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-500/20",
    badge: "HOT",
    category: 'trading'
  },
  { 
    id: 'aitradex1',
    title: "AItradeX1", 
    description: "Advanced AI trading system",
    url: "/aitradex1", 
    icon: Target, 
    color: "text-orange-600", 
    bgColor: "bg-orange-500/20",
    category: 'trading'
  },
  { 
    id: 'portfolio',
    title: "Portfolio", 
    description: "Balance & positions",
    url: "/portfolio", 
    icon: Wallet, 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-500/20",
    category: 'trading'
  },
  { 
    id: 'automation',
    title: "Auto Trading", 
    description: "Automated strategies",
    url: "/automation", 
    icon: Bot, 
    color: "text-violet-600", 
    bgColor: "bg-violet-500/20",
    category: 'trading'
  },

  // Tools Section
  { 
    id: 'markets',
    title: "Markets", 
    description: "Market data & analysis",
    url: "/markets", 
    icon: BarChart3, 
    color: "text-blue-700", 
    bgColor: "bg-blue-600/20",
    category: 'tools'
  },
  { 
    id: 'backtests',
    title: "Backtests", 
    description: "Strategy validation",
    url: "/backtests", 
    icon: TestTube, 
    color: "text-teal-600", 
    bgColor: "bg-teal-500/20",
    category: 'tools'
  },
  { 
    id: 'x-platform',
    title: "X Platform", 
    description: "Extended features",
    url: "/x", 
    icon: Building2, 
    color: "text-red-600", 
    bgColor: "bg-red-500/20",
    category: 'tools'
  },
  { 
    id: 'alerts',
    title: "Alerts", 
    description: "Notifications center",
    url: "/alerts", 
    icon: Bell, 
    color: "text-amber-600", 
    bgColor: "bg-amber-500/20",
    badge: "3",
    category: 'tools'
  },

  // Settings Section
  { 
    id: 'settings',
    title: "Settings", 
    description: "System configuration",
    url: "/settings", 
    icon: Settings, 
    color: "text-gray-600", 
    bgColor: "bg-gray-500/20",
    category: 'settings'
  },
];

interface RightSideNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function RightSideNavigation({ isOpen, onToggle }: RightSideNavigationProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  const categoryTitles = {
    main: '🏠 Main',
    trading: '💹 Trading',
    tools: '🛠️ Tools',
    settings: '⚙️ Settings'
  };

  return (
    <>
      {/* Toggle Button - Always Visible */}
      <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-[60]">
        <Button
          onClick={onToggle}
          className={cn(
            "rounded-l-xl rounded-r-none h-16 w-8 p-0 transition-all duration-300 bg-primary/90 hover:bg-primary border-l border-t border-b border-primary/20",
            isOpen ? "bg-secondary/90 hover:bg-secondary" : ""
          )}
          variant="default"
        >
          {isOpen ? (
            <ChevronRight className="h-5 w-5 text-white" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Right Side Navigation Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-background/95 backdrop-blur-sm border-l border-border shadow-2xl transition-all duration-300 z-[58] overflow-hidden",
          isOpen ? "w-96 opacity-100" : "w-0 opacity-0"
        )}
      >
        {isOpen && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Navigation</h2>
                    <p className="text-sm text-muted-foreground">Quick access menu</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-bold text-primary mb-3">
                    {categoryTitles[category as keyof typeof categoryTitles]}
                  </h3>
                  
                  <div className="space-y-2">
                    {items.map((item) => {
                      const isItemActive = isActive(item.url);
                      
                      return (
                        <Card 
                          key={item.id}
                          className={cn(
                            "transition-all duration-200 hover:scale-[1.02] cursor-pointer border",
                            isItemActive 
                              ? `${item.bgColor} border-current shadow-md` 
                              : "hover:shadow-md border-border hover:border-primary/20"
                          )}
                        >
                          <CardContent className="p-0">
                            <NavLink 
                              to={item.url} 
                              end={item.url === "/"}
                              className={cn(
                                "flex items-center gap-4 p-4 w-full rounded-lg transition-all duration-200",
                                isItemActive 
                                  ? `${item.color} font-bold` 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={onToggle}
                            >
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                isItemActive ? item.bgColor : "bg-muted/50"
                              )}>
                                <item.icon className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-base truncate">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <Badge 
                                      variant={item.badge === "LIVE" ? "default" : "secondary"}
                                      className={cn(
                                        "text-xs font-bold",
                                        item.badge === "LIVE" && "bg-green-500 text-white",
                                        item.badge === "HOT" && "bg-red-500 text-white"
                                      )}
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {item.description}
                                </p>
                              </div>
                            </NavLink>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="text-center">
                <p className="text-sm font-medium text-primary">Unireli Pro Trading</p>
                <p className="text-xs text-muted-foreground">Advanced Trading Platform</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}