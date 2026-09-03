import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";

// Auth & Public Pages
import LoadingPage from "./pages/LoadingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SharedDocumentPage from "@/components/SharedDocumentPage";

// Main Dashboard Pages (Updated to match exact file names)
import Dashboard from "./pages/Dashboard";
import ImportPage from "./pages/import";
import Attendance from "./pages/composer";
import Fees from "./pages/fees";
import Reports from "./pages/reports";  
import Analytics from "./pages/analytics";
import Notes from "./pages/notes";
import Alerts from "./pages/alerts"; 
import Quiz from "./pages/quiz";
import Settings from "./pages/settings";
import ClassesPage from "./pages/ClassesPage";
import ExtraFee from "./components/fees/extrafee";
import NotFound from "./pages/NotFound";

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
            <Route path="/register" element={<RegisterPage />} />

            {/* 3. PUBLIC SHARE ROUTE */}
            <Route path="/notes/share" element={<SharedDocumentPage />} />

            {/* 4. MAIN APP ROUTES */}
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="import" element={<ImportPage />} />
                    <Route path="departments" element={<Navigate to="/import" replace />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="fees" element={<Fees />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="notes" element={<Notes />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="quiz" element={<Quiz />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="classes" element={<ClassesPage />} />
                    <Route path="extra-fee" element={<ExtraFee />} />
                    
                    {/* Fallback to dashboard */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
