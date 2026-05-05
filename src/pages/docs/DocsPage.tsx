import { useParams } from "react-router-dom";
import { endpointsBySlug } from "@/docs/endpoints";
import { flatNav } from "@/docs/navigation";
import { PageBreadcrumb } from "@/components/docs/PageBreadcrumb";
import { EndpointHeader } from "@/components/docs/EndpointHeader";
import { CalloutBox } from "@/components/docs/CalloutBox";
import { ParamsTable } from "@/components/docs/ParamsTable";
import { CodeTabs, buildSnippets } from "@/components/docs/CodeTabs";
import { ResponseTabs } from "@/components/docs/ResponseTabs";
import { PrevNextNav } from "@/components/docs/PrevNextNav";
import { guides } from "./guides";

export default function DocsPage() {
  const { "*": slug = "" } = useParams();

  const ep = endpointsBySlug[slug];
  const guide = guides[slug];
  const navEntry = flatNav.find((i) => i.slug === slug);

  if (!ep && !guide) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Page coming soon</h1>
        <p className="text-muted-foreground">
          This documentation page is being prepared. Browse other sections from the sidebar.
        </p>
        {navEntry && <PrevNextNav slug={slug} />}
      </div>
    );
  }

  if (ep) {
    const snippets = buildSnippets(ep.method, ep.path, ep.exampleBody);
    return (
      <article>
        <PageBreadcrumb category={ep.category} />
        <h1 className="text-3xl font-semibold tracking-tight">{ep.title}</h1>
        <EndpointHeader method={ep.method} path={ep.path} oneLiner={ep.oneLiner} />

        <h2 className="mt-8 text-xl font-semibold">{ep.title}</h2>
        <p className="mt-2 text-[15px] leading-7 text-foreground/90">{ep.description}</p>

        {ep.authNote === "personal" && (
          <CalloutBox type="note" title="Authentication">
            This endpoint requires a <strong>Personal Access Token</strong> in the{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-info">Authorization</code>{" "}
            header. You can get the token from your dashboard settings.
          </CalloutBox>
        )}

        {ep.params && ep.params.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">Parameters</h2>
            <ParamsTable params={ep.params} />
          </>
        )}

        <h2 className="mt-10 text-xl font-semibold">Code Examples</h2>
        <CodeTabs snippets={snippets} />

        <h2 className="mt-10 text-xl font-semibold">Response Examples</h2>
        <ResponseTabs responses={ep.responses} />

        <PrevNextNav slug={slug} />
      </article>
    );
  }

  // Guide
  const G = guide!;
  return (
    <article>
      <PageBreadcrumb category={G.category} />
      <h1 className="text-3xl font-semibold tracking-tight">{G.title}</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{G.intro}</p>
      <div className="prose-docs mt-8">{G.content}</div>
      <PrevNextNav slug={slug} />
    </article>
  );
}
