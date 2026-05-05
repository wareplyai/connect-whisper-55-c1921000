import { EndpointBadge } from "./EndpointBadge";
import { CopyButton } from "./CopyButton";
import type { HttpMethod } from "@/docs/endpoints";

export function EndpointHeader({
  method,
  path,
  oneLiner,
}: {
  method: HttpMethod;
  path: string;
  oneLiner: string;
}) {
  return (
    <div className="my-6 rounded-lg border bg-card-elevated/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <EndpointBadge method={method} />
          <code className="truncate font-mono text-sm text-foreground">{path}</code>
        </div>
        <CopyButton text={path} label="Copy endpoint" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{oneLiner}</p>
    </div>
  );
}
