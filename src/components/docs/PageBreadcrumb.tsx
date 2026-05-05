export function PageBreadcrumb({ category }: { category: string }) {
  return (
    <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{category}</div>
  );
}
