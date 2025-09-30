import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { isSupabaseConfigured } from '@/lib/supabaseClient';
// Core pages only
import Dashboard from "./pages/Dashboard";
import ConnectAPI from "./pages/ConnectAPI";
import Signals from "./pages/Signals";
import Buy from "./pages/Buy";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    (async () => {
      console.log('[Boot] Starting app initialization...');
      console.log('[Boot] Environment check:', {
        supabaseConfigured: true,
        projectId: 'codhlwjogfjywmjyjbbn'
      });
      
      const ok = await isSupabaseConfigured();
      console.info('[Boot] Using Supabase client configured=', ok);
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/api" element={<ConnectAPI />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/buy" element={<Buy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
