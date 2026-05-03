import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  { name: "Trial", price: 0, sessions: "1", limit: "50 msg/day · 3 days" },
  { name: "Basic", price: 6, sessions: "1", limit: "Unlimited" },
  { name: "Pro", price: 15, sessions: "3", limit: "Unlimited", popular: true },
  { name: "Plus", price: 30, sessions: "6", limit: "Unlimited" },
  { name: "Business", price: 45, sessions: "10", limit: "Unlimited" },
];

const features = ["Unlimited Contacts", "No Daily Cap", "MCP Server", "Full API", "Webhooks", "Priority Support"];

const Subscription = () => {
  const [yearly, setYearly] = useState(false);
  const mult = yearly ? 0.85 : 1;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose the plan that fits your needs.</p>
        <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
          <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full transition ${!yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full transition ${yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Yearly · Save 15%</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
        {plans.map((p) => (
          <div key={p.name} className={`relative rounded-xl border bg-card p-6 ${p.popular ? "border-primary glow-primary" : "border-border"}`}>
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most Popular</span>
            )}
            <h3 className="font-semibold">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold">${p.price === 0 ? "0" : (p.price * mult).toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">/{yearly ? "mo" : "mo"}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{p.sessions} session{p.sessions !== "1" ? "s" : ""}</p>
            <p className="text-sm text-muted-foreground">{p.limit}</p>
            <ul className="mt-4 space-y-1.5 text-xs">
              {features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> {f}</li>)}
            </ul>
            <Button className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary-hover">{p.name === "Trial" ? "Start Trial" : "Subscribe"}</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;
