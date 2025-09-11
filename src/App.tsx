import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import Index from "./pages/Index";
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
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/health" element={<Health />} />
            <Route path="/AITRADEX1ORIGINAL" element={<AItradeX1Original />} />
            <Route path="/X" element={<X />} />
            <Route path="/X1" element={<X1 />} />
            <Route path="/X2" element={<X2 />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/signals" element={<Signals />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/backtests" element={<Backtests />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
