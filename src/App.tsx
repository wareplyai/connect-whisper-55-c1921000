import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeadAdminProvider } from "@/contexts/HeadAdminContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HeadAdminRoute } from "@/components/HeadAdminRoute";
import { ScrollToTop } from "@/components/ScrollToTop";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TrialStarted from "./pages/TrialStarted";
import Help from "./pages/Help";
import About from "./pages/About";
import Status from "./pages/Status";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Sessions from "./pages/dashboard/Sessions";
import CreateSession from "./pages/dashboard/CreateSession";
import SessionDetail from "./pages/dashboard/SessionDetail";
import EditSession from "./pages/dashboard/EditSession";
import ConnectSession from "./pages/dashboard/ConnectSession";
import Subscription from "./pages/dashboard/Subscription";
import Plans from "./pages/dashboard/Plans";
import Payments from "./pages/dashboard/Payments";
import AutoReplies from "./pages/dashboard/AutoReplies";
import Inbox from "./pages/dashboard/Inbox";
import AIAgent from "./pages/dashboard/AIAgent";
import BehaviorSettings from "./pages/dashboard/BehaviorSettings";
import Products from "./pages/dashboard/Products";
import ProductImageMatch from "./pages/dashboard/ProductImageMatch";
import WooCommerce from "./pages/dashboard/WooCommerce";
import AbandonedCart from "./pages/dashboard/AbandonedCart";
import CRMDashboard from "./pages/dashboard/crm/CRMDashboard";
import CRMOrders from "./pages/dashboard/crm/CRMOrders";

import CRMLeads from "./pages/dashboard/crm/CRMLeads";
import CRMCourier from "./pages/dashboard/crm/CRMCourier";
import CRMReturns from "./pages/dashboard/crm/CRMReturns";
import CRMCod from "./pages/dashboard/crm/CRMCod";
import CRMNurturing from "./pages/dashboard/crm/CRMNurturing";
import CRMBroadcast from "./pages/dashboard/crm/CRMBroadcast";
import CRMSettings from "./pages/dashboard/crm/CRMSettings";
import AdminPanel from "./pages/admin/AdminPanel";
import HAPayments from "./pages/headadmin/Payments";
import HAPaymentMethods from "./pages/headadmin/PaymentMethods";
import HAPlanPricing from "./pages/headadmin/PlanPricing";

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
import SmsLogs from "./pages/headadmin/SmsLogs";
import HAFeatureAccess from "./pages/headadmin/FeatureAccess";
import HADashboardAds from "./pages/headadmin/DashboardAds";
import HeadAdminMobileLayout from "./layouts/HeadAdminMobileLayout";
import MobileHome from "./pages/headadmin/mobile/MobileHome";
import MobileNotifications from "./pages/headadmin/mobile/MobileNotifications";
import MobilePayments from "./pages/headadmin/mobile/MobilePayments";
import MobileUsers from "./pages/headadmin/mobile/MobileUsers";
import { FeatureGuard } from "./components/FeatureGuard";
import DocsLayout from "./layouts/DocsLayout";
import DocsIndex from "./pages/docs/DocsIndex";
import DocsPage from "./pages/docs/DocsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
        <AuthProvider>
          <HeadAdminProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/trial-started" element={<TrialStarted />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="/status" element={<Status />} />
              <Route path="/privacy" element={<Privacy />} />

              <Route path="/docs" element={<DocsLayout />}>
                <Route index element={<DocsIndex />} />
                <Route path="*" element={<DocsPage />} />
              </Route>

              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<DashboardHome />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="sessions/create" element={<CreateSession />} />
                <Route path="sessions/:id" element={<SessionDetail />} />
                <Route path="sessions/:id/edit" element={<EditSession />} />
                <Route path="sessions/:id/connect" element={<ConnectSession />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="subscription/plans" element={<Plans />} />
                <Route path="payments" element={<Payments />} />
                <Route path="auto-replies" element={<FeatureGuard feature="auto_replies"><AutoReplies /></FeatureGuard>} />
                <Route path="ai-agent" element={<FeatureGuard feature="ai_agent"><AIAgent /></FeatureGuard>} />
                <Route path="behavior" element={<BehaviorSettings />} />
                <Route path="products" element={<Products />} />
                <Route path="woocommerce" element={<WooCommerce />} />
                <Route path="abandoned-cart" element={<FeatureGuard feature="abandoned_cart"><AbandonedCart /></FeatureGuard>} />
                <Route path="crm" element={<CRMDashboard />} />
                <Route path="crm/orders" element={<CRMOrders />} />
                
                <Route path="crm/leads" element={<CRMLeads />} />
                <Route path="crm/courier" element={<CRMCourier />} />
                <Route path="crm/returns" element={<CRMReturns />} />
                <Route path="crm/cod" element={<CRMCod />} />
                <Route path="crm/nurturing" element={<CRMNurturing />} />
                <Route path="crm/broadcast" element={<CRMBroadcast />} />
                <Route path="crm/settings" element={<CRMSettings />} />
              </Route>

              <Route path="/admin" element={<ProtectedRoute adminOnly><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<AdminPanel />} />
              </Route>

              <Route path="/headadmin/login" element={<HeadAdminLogin />} />
              <Route path="/headadmin/m" element={<HeadAdminRoute><HeadAdminMobileLayout /></HeadAdminRoute>}>
                <Route index element={<MobileHome />} />
                <Route path="notifications" element={<MobileNotifications />} />
                <Route path="payments" element={<MobilePayments />} />
                <Route path="users" element={<MobileUsers />} />
              </Route>
              <Route path="/headadmin" element={<HeadAdminRoute><HeadAdminLayout /></HeadAdminRoute>}>
                <Route index element={<HeadAdminOverview />} />
                <Route path="users" element={<AllUsers />} />
                <Route path="sessions" element={<AllSessions />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="messages" element={<AllMessages />} />
                <Route path="notifications" element={<HANotifications />} />
                <Route path="logs" element={<ActivityLogs />} />
                <Route path="payments" element={<HAPayments />} />
                <Route path="payment-methods" element={<HAPaymentMethods />} />
                <Route path="plan-pricing" element={<HAPlanPricing />} />
                <Route path="settings" element={<HASettings />} />
                <Route path="sms-logs" element={<SmsLogs />} />
                <Route path="feature-access" element={<HAFeatureAccess />} />
                <Route path="dashboard-ads" element={<HADashboardAds />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HeadAdminProvider>
        </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
