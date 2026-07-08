import { Suspense } from "react";
import { lazyWithReload as lazy } from "@/lib/lazyWithReload";
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
import { FeatureGuard } from "./components/FeatureGuard";
import { Loader2 } from "lucide-react";

// Public pages — landing is eager (LCP), rest lazy
import Landing from "./pages/Landing";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TrialStarted = lazy(() => import("./pages/TrialStarted"));
const Help = lazy(() => import("./pages/Help"));
const About = lazy(() => import("./pages/About"));
const Status = lazy(() => import("./pages/Status"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Dashboard
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const Sessions = lazy(() => import("./pages/dashboard/Sessions"));
const CreateSession = lazy(() => import("./pages/dashboard/CreateSession"));
const SessionDetail = lazy(() => import("./pages/dashboard/SessionDetail"));
const EditSession = lazy(() => import("./pages/dashboard/EditSession"));
const ConnectSession = lazy(() => import("./pages/dashboard/ConnectSession"));
const Subscription = lazy(() => import("./pages/dashboard/Subscription"));
const Plans = lazy(() => import("./pages/dashboard/Plans"));
const Payments = lazy(() => import("./pages/dashboard/Payments"));
const AutoReplies = lazy(() => import("./pages/dashboard/AutoReplies"));
const Inbox = lazy(() => import("./pages/dashboard/Inbox"));
const AIAgent = lazy(() => import("./pages/dashboard/AIAgent"));
const BehaviorSettings = lazy(() => import("./pages/dashboard/BehaviorSettings"));
const Products = lazy(() => import("./pages/dashboard/Products"));
const AbandonedCart = lazy(() => import("./pages/dashboard/AbandonedCart"));
const Orders = lazy(() => import("./pages/dashboard/Orders"));

// Admin
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));

// Head admin
const HAPayments = lazy(() => import("./pages/headadmin/Payments"));
const HAPaymentMethods = lazy(() => import("./pages/headadmin/PaymentMethods"));
const HAPlanPricing = lazy(() => import("./pages/headadmin/PlanPricing"));
const HeadAdminLayout = lazy(() => import("./layouts/HeadAdminLayout"));
const HeadAdminLogin = lazy(() => import("./pages/headadmin/HeadAdminLogin"));
const HeadAdminOverview = lazy(() => import("./pages/headadmin/Overview"));
const AllUsers = lazy(() => import("./pages/headadmin/AllUsers"));
const AllSessions = lazy(() => import("./pages/headadmin/AllSessions"));
const Revenue = lazy(() => import("./pages/headadmin/Revenue"));
const AllMessages = lazy(() => import("./pages/headadmin/AllMessages"));
const HANotifications = lazy(() => import("./pages/headadmin/Notifications"));
const ActivityLogs = lazy(() => import("./pages/headadmin/ActivityLogs"));
const HASettings = lazy(() => import("./pages/headadmin/Settings"));
const SmsLogs = lazy(() => import("./pages/headadmin/SmsLogs"));
const HAFeatureAccess = lazy(() => import("./pages/headadmin/FeatureAccess"));
const HADashboardAds = lazy(() => import("./pages/headadmin/DashboardAds"));
const HAUserStorage = lazy(() => import("./pages/headadmin/UserStorage"));
const HAReplyUsage = lazy(() => import("./pages/headadmin/ReplyUsage"));
const HAAIKeys = lazy(() => import("./pages/headadmin/AIKeys"));
const HAGlobalKeyUsage = lazy(() => import("./pages/headadmin/GlobalKeyUsage"));
const HAKeyBreakdown = lazy(() => import("./pages/headadmin/KeyBreakdown"));
const HAPendingApprovals = lazy(() => import("./pages/headadmin/PendingApprovals"));
const HeadAdminMobileLayout = lazy(() => import("./layouts/HeadAdminMobileLayout"));
const MobileHome = lazy(() => import("./pages/headadmin/mobile/MobileHome"));
const MobileNotifications = lazy(() => import("./pages/headadmin/mobile/MobileNotifications"));
const MobilePayments = lazy(() => import("./pages/headadmin/mobile/MobilePayments"));
const MobileUsers = lazy(() => import("./pages/headadmin/mobile/MobileUsers"));

// Docs
const DocsLayout = lazy(() => import("./layouts/DocsLayout"));
const DocsIndex = lazy(() => import("./pages/docs/DocsIndex"));
const DocsPage = lazy(() => import("./pages/docs/DocsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => null;

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
            <Suspense fallback={<RouteFallback />}>
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
                <Route path="behavior" element={<FeatureGuard feature="behavior"><BehaviorSettings /></FeatureGuard>} />
                <Route path="products" element={<FeatureGuard feature="products"><Products /></FeatureGuard>} />
                <Route path="abandoned-cart" element={<FeatureGuard feature="abandoned_cart"><AbandonedCart /></FeatureGuard>} />
                <Route path="orders" element={<Orders />} />
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
                <Route path="pending-users" element={<HAPendingApprovals />} />
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
                <Route path="user-storage" element={<HAUserStorage />} />
                <Route path="reply-usage" element={<HAReplyUsage />} />
                <Route path="ai-keys" element={<HAAIKeys />} />
                <Route path="global-key-usage" element={<HAGlobalKeyUsage />} />
                <Route path="key-breakdown" element={<HAKeyBreakdown />} />
              </Route>


              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </HeadAdminProvider>
        </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
