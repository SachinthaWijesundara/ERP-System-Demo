import {
  LayoutGrid,
  Users,
  FileText,
  Hammer,
  ShoppingBag,
  Package,
  Receipt,
  Settings,
  IdCard,
} from 'lucide-react'

// Sidebar sections, top to bottom. The section with `pinned: true` sits at the foot.
export const sections = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }],
  },
  {
    label: 'Sales',
    items: [
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'quotations', label: 'Quotations', icon: FileText },
      { id: 'pos', label: 'POS', icon: ShoppingBag },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'projects', label: 'Projects', icon: Hammer },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'invoices', label: 'Invoices & payments', icon: Receipt },
    ],
  },
  {
    label: 'Team',
    items: [{ id: 'staff', label: 'Staff', icon: IdCard }],
  },
  {
    label: 'Admin',
    pinned: true,
    items: [{ id: 'settings', label: 'User settings', icon: Settings }],
  },
]

export const modules = sections.flatMap((s) => s.items)

export const branches = ['Matara', 'Nugegoda']

// Branch switcher option that shows records from every branch.
export const ALL_BRANCHES = 'All branches'
