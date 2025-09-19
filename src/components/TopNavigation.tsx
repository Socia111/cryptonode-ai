import React from 'react';
import { Search, Bell, ArrowUpRight, ArrowDownLeft, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import LivePrice from '@/components/LivePrice';
import UserMenu from '@/components/UserMenu';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface TopNavigationProps {
  onMobileMenuToggle?: () => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ onMobileMenuToggle }) => {
  const { toast } = useToast();

  return (
    <header className="h-14 lg:h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shrink-0">
      <div className="flex items-center justify-between h-full px-3 lg:px-4">
        {/* Left section - Mobile menu toggle and search */}
        <div className="flex items-center gap-2 lg:gap-4 min-w-0">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden p-2 hover:bg-accent rounded-md touch-manipulation active:bg-accent/80 shrink-0"
            onClick={onMobileMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Desktop Sidebar Toggle */}
          <SidebarTrigger className="hidden lg:flex p-2 hover:bg-accent rounded-md shrink-0" />
          
          {/* Search - Hidden on small mobile, visible on larger screens */}
          <div className="relative hidden sm:block min-w-0 flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              className="pl-10 bg-muted/50 border-border h-9"
            />
          </div>
        </div>

        {/* Center section - Live tickers - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 lg:gap-6 min-w-0">
          <div className="hidden lg:block">
            <LivePrice />
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs lg:text-sm">
              ETH $3,245
            </Badge>
            <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-xs lg:text-sm">
              SOL $98.5
            </Badge>
          </div>
        </div>

        {/* Right section - Actions and profile */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Deposit/Withdraw - Hidden on small mobile */}
          <div className="hidden sm:flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 lg:gap-2 text-xs lg:text-sm"
              onClick={() => {
                toast({
                  title: "Deposit",
                  description: "Deposit functionality will be available soon",
                });
              }}
            >
              <ArrowDownLeft className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden md:inline">Deposit</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 lg:gap-2 text-xs lg:text-sm"
              onClick={() => {
                toast({
                  title: "Withdraw",
                  description: "Withdraw functionality will be available soon",
                });
              }}
            >
              <ArrowUpRight className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden md:inline">Withdraw</span>
            </Button>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative w-8 h-8 lg:w-9 lg:h-9"
              onClick={() => {
                toast({
                  title: "Notifications",
                  description: "You have 3 new trading signals",
                });
              }}
            >
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
              <Badge className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 p-0 flex items-center justify-center text-xs bg-destructive">
                3
              </Badge>
            </Button>
          </div>

          {/* User Profile */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;