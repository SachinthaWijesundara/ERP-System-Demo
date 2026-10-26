import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import Link from './RecordLink.jsx'

// A staff member's name, linking to their Staff page. Every person shown
// anywhere in the system is a registered staff member, stored by staff ID.
// The name is plain text for someone who can't open the Staff list.
export default function StaffLink({ id, onOpenRecord, fallback = '—' }) {
  const data = useData()
  const auth = useAuth()
  const person = data.staff.find((p) => p.id === id)
  if (!person) return id ? `${id} (not on the staff list)` : fallback
  if (!auth.can('staff.view') || !onOpenRecord) return person.name
  return <Link onClick={() => onOpenRecord('staff', person.id)}>{person.name}</Link>
}

// The plain name for a staff ID, for text such as search and PDFs.
export function staffName(data, id) {
  return data.staff.find((p) => p.id === id)?.name ?? ''
}
