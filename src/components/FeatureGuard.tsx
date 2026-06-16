import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureAccess, FeatureKey } from "@/hooks/useFeatureAccess";

export function FeatureGuard({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { access, loading } = useFeatureAccess();
  if (loading) return null;
  if (!access[feature]) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
