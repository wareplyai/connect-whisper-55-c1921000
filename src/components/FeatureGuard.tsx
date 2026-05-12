import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useFeatureAccess, FeatureKey } from "@/hooks/useFeatureAccess";

export function FeatureGuard({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { access, loading } = useFeatureAccess();
  if (loading) return null;
  if (!access[feature]) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4 p-8 rounded-2xl border border-border bg-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">This feature is locked</h2>
          <p className="text-sm text-muted-foreground">
            Access to this feature is currently disabled for your account. Please contact your administrator to unlock it.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
