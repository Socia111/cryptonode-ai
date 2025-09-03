import React from 'react';
import { Search, Bell, User, Wallet, ArrowUpRight, ArrowDownLeft, LogOut, Shield, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LivePrice from '@/components/LivePrice';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface TopNavigationProps {
  onMobileMenuToggle?: () => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ onMobileMenuToggle }) => {
  const userInitials = 'U';
  const { toast } = useToast();

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section - Mobile menu toggle and search */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden p-2 hover:bg-accent rounded-md touch-manipulation active:bg-accent/80"
            onClick={onMobileMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Desktop Sidebar Toggle */}
          <SidebarTrigger className="hidden lg:flex p-2 hover:bg-accent rounded-md" />
          
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search markets, symbols... ⌘K"
              className="pl-10 w-64 lg:w-80 bg-muted/50 border-border"
            />
          </div>
        </div>

        {/* Center section - Live tickers */}
        <div className="flex items-center gap-6">
          <LivePrice />
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              ETH $3,245
            </Badge>
            <Badge variant="outline" className="bg-info/10 text-info border-info/20">
              SOL $98.5
            </Badge>
          </div>
        </div>

        {/* Right section - Actions and profile */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => {
              toast({
                title: "Deposit",
                description: "Deposit functionality will be available soon",
              });
            }}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => {
              toast({
                title: "Withdraw",
                description: "Withdraw functionality will be available soon",
              });
            }}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </Button>

          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => {
                toast({
                  title: "Notifications",
                  description: "You have 3 new trading signals",
                });
              }}
            >
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-destructive">
                3
              </Badge>
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="truncate">User</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Wallet className="w-4 h-4 mr-2" />
                Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Theme
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;