import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import TopNavigation from '@/components/TopNavigation';

import LiveMonitoringWidget from '@/components/LiveMonitoringWidget';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-background text-foreground overflow-hidden">
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
          
        </div>

        {/* Mobile Sidebar Overlay */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="right" className="p-0 w-80 border-l border-border lg:hidden">
            <div className="h-full bg-background">
              <AppSidebar />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <AppSidebar />
        </div>

        {/* Live Monitoring Widget */}
        <LiveMonitoringWidget />
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;