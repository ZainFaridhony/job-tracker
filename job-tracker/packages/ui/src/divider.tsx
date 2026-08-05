export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-outline-subtle" />
  return (
    <div className="flex items-center gap-4">
      <hr className="flex-1 border-outline-subtle" />
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <hr className="flex-1 border-outline-subtle" />
    </div>
  )
}
