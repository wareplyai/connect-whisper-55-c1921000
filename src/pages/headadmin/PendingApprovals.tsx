import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Check, X, Clock, Mail, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type PendingUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  approval_status: string;
};

export default function PendingApprovals() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "rejected" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, email, full_name, created_at, approval_status")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter !== "all") q = q.eq("approval_status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setUsers((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const act = async (id: string, status: "approved" | "rejected") => {
    setActingId(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: status,
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      } as any)
      .eq("id", id);
    setActingId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "User approved" : "User rejected");
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            New signups require your approval before they can log in.
          </p>
        </div>
        <div className="flex gap-2">
          {(["pending", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors capitalize ${
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} users</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-foreground/[0.02] transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.full_name || "(no name)"}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Mail className="h-3 w-3" /> {u.email}
                  <span className="mx-1">•</span>
                  Signed up {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                </div>
              </div>
              <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded ${
                u.approval_status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                u.approval_status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                'bg-green-500/10 text-green-600 dark:text-green-400'
              }`}>{u.approval_status}</span>
              <div className="flex gap-2">
                {u.approval_status !== 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => act(u.id, "approved")}
                    disabled={actingId === u.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actingId === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" /> Approve</>}
                  </Button>
                )}
                {u.approval_status !== 'rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(u.id, "rejected")}
                    disabled={actingId === u.id}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
