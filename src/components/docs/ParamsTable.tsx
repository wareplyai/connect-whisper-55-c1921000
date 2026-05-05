import type { Param } from "@/docs/endpoints";

export function ParamsTable({ params }: { params: Param[] }) {
  if (!params.length) return null;
  return (
    <div className="my-5 overflow-hidden rounded-lg border">
      <table className="w-full border-collapse text-[13px]">
        <thead className="bg-card-elevated/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="border-b px-4 py-2.5 text-left font-semibold">Name</th>
            <th className="border-b px-4 py-2.5 text-left font-semibold">Type</th>
            <th className="border-b px-4 py-2.5 text-left font-semibold">Required</th>
            <th className="border-b px-4 py-2.5 text-left font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={p.name} className={i % 2 === 0 ? "bg-transparent" : "bg-card-elevated/30"}>
              <td className="border-b px-4 py-2.5 align-top font-mono text-info">{p.name}</td>
              <td className="border-b px-4 py-2.5 align-top font-mono text-xs text-info">{p.type}</td>
              <td className="border-b px-4 py-2.5 align-top">
                {p.required ? (
                  <span className="font-semibold text-success">Yes</span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </td>
              <td className="border-b px-4 py-2.5 align-top text-foreground/90">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
