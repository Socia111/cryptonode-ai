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
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col h-full">
          <TopNavigation />
          
          <main className="flex-1 overflow-y-auto pb-16">
            {children}
          </main>
          
          <BottomSignalsBar />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;