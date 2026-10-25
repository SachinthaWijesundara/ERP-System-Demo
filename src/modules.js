import {
  LayoutGrid,
  Users,
  FileText,
  Hammer,
  ShoppingBag,
  Package,
  Receipt,
  Settings,
} from 'lucide-react'

// Sidebar entries. `group: 'bottom'` pins an item to the foot of the sidebar.
export const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'projects', label: 'Projects', icon: Hammer },
  { id: 'pos', label: 'POS', icon: ShoppingBag },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'invoices', label: 'Invoices & payments', icon: Receipt },
  { id: 'settings', label: 'User settings', icon: Settings, group: 'bottom' },
]
