import React from 'react';
import { Search, Bell, User, Wallet, ArrowUpRight, ArrowDownLeft, LogOut, Shield } from 'lucide-react';
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
import { useAuth } from './AuthProvider';

const TopNavigation = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section - Sidebar trigger and search */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="ml-2" />
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search markets, symbols... ⌘K"
              className="pl-10 w-80 bg-muted/50 border-border"
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
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowDownLeft className="w-4 h-4" />
            Deposit
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </Button>

          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
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
                <span className="truncate">{user?.email}</span>
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
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
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