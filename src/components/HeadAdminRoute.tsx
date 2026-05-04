import { Navigate } from "react-router-dom";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";

export const HeadAdminRoute = ({ children }: { children: JSX.Element }) => {
  const { headAdmin, loading } = useHeadAdmin();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  if (!headAdmin) return <Navigate to="/headadmin/login" replace />;
  return children;
};
