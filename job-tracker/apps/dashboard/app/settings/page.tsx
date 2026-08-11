import { redirect } from 'next/navigation'

/** Preferences is the only section with anything in it, so /settings lands
 *  there rather than on a chooser with two dead ends. */
export default function SettingsIndex() {
  redirect('/settings/preferences')
}
