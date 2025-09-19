import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNavigation from '@/components/TopNavigation';
import BottomSignalsBar from '@/components/BottomSignalsBar';
import { RightSideNavigation } from '@/components/RightSideNavigation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [rightMenuOpen, setRightMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col w-full bg-background text-foreground overflow-hidden">
      {/* Top Navigation */}
      <TopNavigation onRightMenuToggle={() => setRightMenuOpen(!rightMenuOpen)} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex w-full min-h-0">
        {/* Primary Content */}
        <main className="flex-1 overflow-y-auto overscroll-behavior-y-contain bg-background">
          <div className="min-h-full pb-20 lg:pb-4">
            <div className="container mx-auto px-4 py-4 max-w-7xl">
              {children}
            </div>
          </div>
        </main>
        
        {/* Right Side Navigation */}
        <RightSideNavigation 
          isOpen={rightMenuOpen} 
          onToggle={() => setRightMenuOpen(!rightMenuOpen)} 
        />
      </div>
      
      {/* Bottom Navigation - Mobile Only */}
      <div className="lg:hidden">
        <BottomSignalsBar />
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
  );
};

export default MainLayout;