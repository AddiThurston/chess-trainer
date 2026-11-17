export function TitleBadge({ title }: { title: string }) {
  if (!title) return null;
  return <span className="rounded bg-due px-1 text-xs font-bold text-primary-foreground">{title}</span>;
}
