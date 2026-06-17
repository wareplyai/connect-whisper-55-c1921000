import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { saveApprovalNotice, showApprovalToast } from "@/lib/accountApproval";

export const ProtectedRoute = ({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const isBlocked = !loading && !!user && (!profile || profile.is_active === false || profile.approval_status !== "approved");
  const noticeStatus = profile?.approval_status === "rejected" ? "rejected" : "pending";

  useEffect(() => {
    if (!isBlocked) return;
    saveApprovalNotice(noticeStatus);
    signOut().finally(() => showApprovalToast(noticeStatus));
  }, [isBlocked, noticeStatus, signOut]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isBlocked) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};
