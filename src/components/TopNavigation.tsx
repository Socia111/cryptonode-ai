import React from 'react';
import { Search, Bell, User, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

const TopNavigation = () => {
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
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;