import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import TopNavigation from '@/components/TopNavigation';
import BottomSignalsBar from '@/components/BottomSignalsBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-background text-foreground overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-80 border-r border-border lg:hidden">
            <div className="h-full bg-background">
              <AppSidebar />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <AppSidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 w-full">
          <TopNavigation onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
          
          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto overscroll-behavior-y-contain bg-background">
            <div className="min-h-full pb-20 lg:pb-4">
              <div className="container mx-auto px-4 py-4 max-w-7xl">
                {children}
              </div>
            </div>
          </main>
          
          {/* Bottom Navigation - Mobile Only */}
          <div className="lg:hidden">
            <BottomSignalsBar />
          </div>
        </div>
        
        {/* Home Button - Fixed Bottom Left */}
        <div className="fixed bottom-20 left-4 lg:bottom-4 z-[9999]">
          <Button
            onClick={() => {
              console.log('🏠 Home button clicked - navigating to /');
              navigate('/');
            }}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all duration-200 hover:scale-105 rounded-full h-12 w-12 p-0"
            title="Go to Home"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;