export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded bg-error-surface px-3 py-2 text-sm text-text-on-error-surface"
    >
      {message}
    </p>
  )
}
