import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeadAdminProvider } from "@/contexts/HeadAdminContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HeadAdminRoute } from "@/components/HeadAdminRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TrialStarted from "./pages/TrialStarted";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Sessions from "./pages/dashboard/Sessions";
import CreateSession from "./pages/dashboard/CreateSession";
import SessionDetail from "./pages/dashboard/SessionDetail";
import EditSession from "./pages/dashboard/EditSession";
import ConnectSession from "./pages/dashboard/ConnectSession";
import Subscription from "./pages/dashboard/Subscription";
import AdminPanel from "./pages/admin/AdminPanel";

import HeadAdminLayout from "./layouts/HeadAdminLayout";
import HeadAdminLogin from "./pages/headadmin/HeadAdminLogin";
import HeadAdminOverview from "./pages/headadmin/Overview";
import AllUsers from "./pages/headadmin/AllUsers";
import AllSessions from "./pages/headadmin/AllSessions";
import Revenue from "./pages/headadmin/Revenue";
import AllMessages from "./pages/headadmin/AllMessages";
import HANotifications from "./pages/headadmin/Notifications";
import ActivityLogs from "./pages/headadmin/ActivityLogs";
import HASettings from "./pages/headadmin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <HeadAdminProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<DashboardHome />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="sessions/create" element={<CreateSession />} />
                <Route path="sessions/:id" element={<SessionDetail />} />
                <Route path="sessions/:id/edit" element={<EditSession />} />
                <Route path="sessions/:id/connect" element={<ConnectSession />} />
                <Route path="subscription" element={<Subscription />} />
              </Route>

              <Route path="/admin" element={<ProtectedRoute adminOnly><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<AdminPanel />} />
              </Route>

              <Route path="/headadmin/login" element={<HeadAdminLogin />} />
              <Route path="/headadmin" element={<HeadAdminRoute><HeadAdminLayout /></HeadAdminRoute>}>
                <Route index element={<HeadAdminOverview />} />
                <Route path="users" element={<AllUsers />} />
                <Route path="sessions" element={<AllSessions />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="messages" element={<AllMessages />} />
                <Route path="notifications" element={<HANotifications />} />
                <Route path="logs" element={<ActivityLogs />} />
                <Route path="settings" element={<HASettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HeadAdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
