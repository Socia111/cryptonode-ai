import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import TopNavigation from '@/components/TopNavigation';
import BottomSignalsBar from '@/components/BottomSignalsBar';
interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-background overflow-hidden touch-manipulation">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col h-full min-w-0">
          <TopNavigation />
          
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