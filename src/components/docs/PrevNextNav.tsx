import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getPrevNext } from "@/docs/navigation";

export function PrevNextNav({ slug }: { slug: string }) {
  const { prev, next } = getPrevNext(slug);
  return (
    <div className="mt-12 grid grid-cols-1 gap-3 border-t pt-6 sm:grid-cols-2">
      {prev ? (
        <Link
          to={`/docs/${prev.slug}`}
          className="group flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-card-elevated"
        >
          <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="h-3 w-3" /> Previous
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary">{prev.title}</span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={`/docs/${next.slug}`}
          className="group flex flex-col rounded-lg border bg-card p-4 text-right transition-colors hover:border-primary/60 hover:bg-card-elevated sm:items-end"
        >
          <span className="mb-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="h-3 w-3" />
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary">{next.title}</span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
