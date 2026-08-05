import { redirect } from 'next/navigation'

// The dashboard app has no landing page of its own; that is apps/web.
export default function IndexPage() {
  redirect('/dashboard')
}
