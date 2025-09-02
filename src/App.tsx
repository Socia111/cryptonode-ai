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
import X from "./pages/X";
import X1 from "./pages/X1";
import X2 from "./pages/X2";
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
            <Route path="/X" element={<X />} />
            <Route path="/X1" element={<X1 />} />
            <Route path="/X2" element={<X2 />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
