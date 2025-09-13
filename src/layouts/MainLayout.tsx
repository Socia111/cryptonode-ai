import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import TopNavigation from '@/components/TopNavigation';
import BottomSignalsBar from '@/components/BottomSignalsBar';
import GlobalSignalsPanel from '@/components/GlobalSignalsPanel';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        
        {/* Global Signals Panel - Available on all pages */}
        <GlobalSignalsPanel showTrigger={true} />
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;