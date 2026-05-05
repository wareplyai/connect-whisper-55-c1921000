import { Link } from "react-router-dom";
import { navigation } from "@/docs/navigation";
import { endpointsBySlug } from "@/docs/endpoints";
import { EndpointBadge } from "@/components/docs/EndpointBadge";

export default function DocsIndex() {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">API Documentation</div>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">WaReply AI Documentation</h1>
      <p className="text-base leading-relaxed text-muted-foreground">
        Build powerful WhatsApp integrations with WaReply AI. Browse the categories below to learn how to
        manage sessions, send messages, work with contacts and groups, and react to webhooks in real time.
      </p>

      <div className="mt-10 space-y-10">
        {navigation.map((cat) => (
          <section key={cat.label}>
            <h2 className="mb-3 text-xl font-semibold">{cat.label}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {cat.items.map((item) => {
                const ep = endpointsBySlug[item.slug];
                return (
                  <Link
                    key={item.slug}
                    to={`/docs/${item.slug}`}
                    className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-card-elevated"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      {ep && <EndpointBadge method={ep.method} />}
                      <span className="text-sm font-medium text-foreground group-hover:text-primary">
                        {item.title}
                      </span>
                    </div>
                    {ep ? (
                      <code className="block truncate font-mono text-xs text-muted-foreground">{ep.path}</code>
                    ) : (
                      <span className="text-xs text-muted-foreground">Guide</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
