import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Lazy-loaded heavy pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MapPage = lazy(() => import("./pages/MapPage"));
const SharedLesson = lazy(() => import("./pages/SharedLesson"));
const Library = lazy(() => import("./pages/Library"));
const Lessons = lazy(() => import("./pages/Lessons"));
const Explore = lazy(() => import("./pages/Explore"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-muted-foreground animate-pulse font-serif text-lg">Loading…</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/lesson/:lessonId" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
            <Route path="/lessons" element={<Lessons />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/share/:token" element={<SharedLesson />} />
            <Route path="/library" element={<Library />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
