import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";

// Auth & Public Pages (Existing Files)
import LoadingPage from "./pages/LoadingPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

// Main Dashboard Pages (Existing Files)
import Dashboard from "./pages/Dashboard";
import ImportPage from "./pages/import";
import Composer from "./pages/composer";
import Clients from "./pages/clients";
import Quiz from "./pages/quiz";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* 1. INITIAL LOADING SCREEN */}
            <Route path="/" element={<LoadingPage />} />

            {/* 2. AUTHENTICATION PAGES */}
            <Route path="/login" element={<LoginPage />} />

            {/* 3. MAIN APP ROUTES */}
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="import" element={<ImportPage />} />
                    <Route path="composer" element={<Composer />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="quiz" element={<Quiz />} />

                    {/* Old route redirects for backwards compatibility */}
                    <Route path="attendance" element={<Navigate to="/composer" replace />} />
                    <Route path="fees" element={<Navigate to="/clients" replace />} />

                    {/* Fallback to 404 or Dashboard */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
