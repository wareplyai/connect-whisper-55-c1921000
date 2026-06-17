import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const ProtectedRoute = ({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || profile.is_active === false || profile.approval_status !== "approved") {
    const message = profile?.approval_status === "rejected"
      ? "Your account has been rejected. Contact admin: 01948695672"
      : "Apnar account pending. Approval er jonno admin er sathe contact korun: 01948695672 (WhatsApp/Call). Approved hole login korte parben.";
    signOut().finally(() => toast.error(message, { duration: 12000 }));
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};
