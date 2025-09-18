import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Trade from "./pages/Trade";
import Auth from "./pages/Auth";
import Automation from "./pages/Automation";
import CoinEx from "./pages/CoinEx";
import AuthGuard from "./components/AuthGuard";
import { RebuildConsole } from "./components/RebuildConsole";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/rebuild" element={<RebuildConsole />} />
              <Route path="/coinex" element={<CoinEx />} />
              <Route path="/" element={
                <AuthGuard>
                  <Index />
                </AuthGuard>
              } />
              <Route path="/trade" element={
                <AuthGuard>
                  <Trade />
                </AuthGuard>
              } />
              <Route path="/automation" element={
                <AuthGuard>
                  <Automation />
                </AuthGuard>
              } />
              <Route path="*" element={
                <AuthGuard>
                  <Index />
                </AuthGuard>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;