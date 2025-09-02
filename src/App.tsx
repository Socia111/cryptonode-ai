import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import Index from "./pages/Index";
import Health from "./pages/Health";
import AItradeX1Original from "./pages/AItradeX1Original";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    (async () => {
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
            <Route path="/health" element={<Health />} />
            <Route path="/AITRADEX1ORIGINAL" element={<AItradeX1Original />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
