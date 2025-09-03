import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import TopNavigation from '@/components/TopNavigation';
import BottomSignalsBar from '@/components/BottomSignalsBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        
        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64 lg:hidden">
            <AppSidebar />
          </SheetContent>
        </Sheet>
        
        <div className="flex-1 flex flex-col h-full min-w-0">
          <TopNavigation onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
          
          <main className="flex-1 overflow-y-auto pb-16 overscroll-behavior-y-contain">
            {children}
          </main>
          
          <BottomSignalsBar />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;