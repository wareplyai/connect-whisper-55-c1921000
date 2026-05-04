import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

const KEY = "n8n_banner_dismissed_v1";

export const N8nBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(KEY) !== "1");
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div className="relative rounded-xl border border-border bg-card p-4 pr-10">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">Automate WhatsApp in n8n</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Use our official WareplyAI n8n community node to send messages, handle webhooks, and manage sessions without manual HTTP requests. Faster setup, fewer errors, and built for production workflows.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href="https://docs.n8n.io/integrations/community-nodes/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-card-elevated"
            >
              view docs →
            </a>
            <a
              href="https://www.npmjs.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              view npm package
            </a>
          </div>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-card-elevated hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
