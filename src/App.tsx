import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import Home from "./pages/Home";
import Health from "./pages/Health";
import AItradeX1Original from "./pages/AItradeX1Original";
import X from "./pages/X";
import X1 from "./pages/X1";
import X2 from "./pages/X2";
import Trade from "./pages/Trade";
import Portfolio from "./pages/Portfolio";
import Signals from "./pages/Signals";
import Markets from "./pages/Markets";
import Backtests from "./pages/Backtests";
import Automation from "./pages/Automation";
import Alerts from "./pages/Alerts";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    (async () => {
      console.log('[Boot] Starting app initialization...');
      console.log('[Boot] Environment check:', {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      const ok = await isSupabaseConfigured();
      console.info('[Boot] Using Supabase client @', import.meta.env.VITE_SUPABASE_URL, 'configured=', ok);
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
          <Route path="/home" element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/health" element={<AuthGuard><Health /></AuthGuard>} />
            <Route path="/AITRADEX1ORIGINAL" element={<AuthGuard><AItradeX1Original /></AuthGuard>} />
            <Route path="/X" element={<AuthGuard><X /></AuthGuard>} />
            <Route path="/X1" element={<AuthGuard><X1 /></AuthGuard>} />
            <Route path="/X2" element={<AuthGuard><X2 /></AuthGuard>} />
            <Route path="/trade" element={<AuthGuard><Trade /></AuthGuard>} />
            <Route path="/portfolio" element={<AuthGuard><Portfolio /></AuthGuard>} />
            <Route path="/signals" element={<AuthGuard><Signals /></AuthGuard>} />
            <Route path="/markets" element={<AuthGuard><Markets /></AuthGuard>} />
            <Route path="/backtests" element={<AuthGuard><Backtests /></AuthGuard>} />
            <Route path="/automation" element={<AuthGuard><Automation /></AuthGuard>} />
            <Route path="/alerts" element={<AuthGuard><Alerts /></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
