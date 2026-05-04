import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, X } from "lucide-react";

type Method = {
  id: string;
  method_name: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  is_active: boolean;
};

type Plan = {
  plan_name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
};

const methodTheme: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  bkash:  { color: "border-[#E2136E]", bg: "bg-[#E2136E]", label: "bKash",  emoji: "💗" },
  nagad:  { color: "border-[#F6821F]", bg: "bg-[#F6821F]", label: "Nagad",  emoji: "🟠" },
  rocket: { color: "border-[#8B32A8]", bg: "bg-[#8B32A8]", label: "Rocket", emoji: "🟣" },
  bank:   { color: "border-[#1A56DB]", bg: "bg-[#1A56DB]", label: "Bank Transfer", emoji: "🏦" },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan | null;
  yearly: boolean;
}

export const PaymentModal = ({ open, onOpenChange, plan, yearly }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [methods, setMethods] = useState<Method[]>([]);
  const [selected, setSelected] = useState<Method | null>(null);
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const amount = plan ? (yearly ? plan.price_yearly : plan.price_monthly) : 0;

  useEffect(() => {
    if (!open) return;
    setStep(1); setSelected(null); setTrxId(""); setSenderNumber("");
    supabase.from("payment_methods").select("*").eq("is_active", true).then(({ data }) => {
      setMethods((data as Method[]) || []);
    });
  }, [open]);

  if (!plan) return null;

  const submit = async () => {
    if (!user || !selected) return;
    if (!trxId.trim() || !senderNumber.trim()) {
      toast.error("Transaction ID and sender number are required");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("payment_transactions").insert({
        user_id: user.id,
        plan: plan.plan_name,
        amount,
        payment_method: selected.method_name,
        transaction_id: trxId.trim(),
        sender_number: senderNumber.trim(),
        status: "pending",
      });
      if (error) throw error;
      setStep(4);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Complete Your Subscription</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plan.display_name} Plan — ${amount}/{yearly ? "year" : "month"}
            </p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step < 4 && (
          <div className="flex items-center gap-2 px-6 pt-4 text-xs text-muted-foreground">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s}</span>
                {s < 3 && <span className="w-6 h-px bg-border" />}
              </div>
            ))}
            <span className="ml-2">Step {step} of 3</span>
          </div>
        )}

        <div className="px-6 py-5">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Choose your payment method</p>
              {methods.map((m) => {
                const t = methodTheme[m.method_name] || { color: "border-border", bg: "bg-muted", label: m.method_name, emoji: "💳" };
                const isSel = selected?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition hover:shadow-md ${isSel ? t.color : "border-border"}`}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-lg text-white ${t.bg}`}>{t.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground truncate">Account: {m.account_number}</p>
                    </div>
                    {isSel && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
              <Button onClick={() => setStep(2)} disabled={!selected} className="w-full">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && selected && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 bg-card">
                <p className="text-sm font-semibold">{methodTheme[selected.method_name]?.label || selected.method_name}</p>
                <p className="text-xs text-muted-foreground">{selected.account_name}</p>
                <p className="text-base font-mono mt-1">{selected.account_number}</p>
              </div>
              <div className="rounded-xl bg-muted p-4 text-sm space-y-1">
                <p className="font-semibold mb-1">How to pay:</p>
                <p className="text-muted-foreground whitespace-pre-line">{selected.instructions || "Send money to the account above and copy your Transaction ID."}</p>
              </div>
              <div className="rounded-xl border-2 border-green-500/40 bg-green-500/5 p-4 text-center">
                <p className="text-xs text-muted-foreground">Amount to pay</p>
                <p className="text-2xl font-bold text-green-500 mt-1">${amount}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Enter Payment Details</p>
              <div className="space-y-2">
                <Label>Transaction ID / TrxID *</Label>
                <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder={`Enter your ${selected?.method_name || ""} transaction ID`} />
              </div>
              <div className="space-y-2">
                <Label>Your Payment Number *</Label>
                <Input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="Number you paid from (01XXXXXXXXX)" />
              </div>
              <div className="space-y-2">
                <Label>Screenshot (optional)</Label>
                <label className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 cursor-pointer hover:bg-muted text-sm">
                  <Upload className="h-4 w-4" />
                  <span className="flex-1 truncate">{file?.name || "Upload payment screenshot for faster approval"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs">
                ⏳ Your payment will be verified within 1–24 hours. You'll receive a notification once approved.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={submitting}>Back</Button>
                <Button onClick={submit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Payment"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6 space-y-3">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-500/10 text-green-500">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Payment Submitted!</h3>
              <p className="text-sm text-muted-foreground">Your payment is under review. We'll activate your plan within 1–24 hours.</p>
              <p className="text-xs font-mono bg-muted rounded px-3 py-1.5 inline-block">Transaction ID: {trxId}</p>
              <Button onClick={() => onOpenChange(false)} className="w-full mt-2">Go to Dashboard</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
