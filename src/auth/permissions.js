// Who can see and do what. Access works at three levels, as in the studio's
// "who can see and do what" guide:
//   menu   - whether a module appears in someone's sidebar at all
//   action - which buttons they get inside it (create, edit, approve…)
//   data   - which figures and rows they can see (cost prices, profit, only
//            their own projects…)
//
// Permissions belong to a role (Sales / front desk, Designer…), not to a
// person. The admin changes them in User settings; everyone with that role
// then gets the same version of the system. The Admin role always has
// everything and can't be changed, and only the admin can open User settings.

// Every permission, grouped by module. `kind` is the level it works at;
// `limit` permissions hold a number instead of on/off.
export const PERMISSION_GROUPS = [
  {
    module: 'general',
    label: 'General',
    items: [{ key: 'branches.all', kind: 'data', label: 'See both branches (off: only their own branch)' }],
  },
  {
    module: 'dashboard',
    label: 'Dashboard',
    items: [
      { key: 'dashboard.view', kind: 'menu', label: 'Open the dashboard' },
      { key: 'dashboard.sales', kind: 'data', label: 'Sales: counter sales, quotes waiting for a reply, payments to chase' },
      { key: 'dashboard.money', kind: 'data', label: 'Money: revenue by month, profit per project, outstanding and overdue' },
      { key: 'dashboard.projects', kind: 'data', label: 'Projects: jobs by stage and deadlines this week' },
      { key: 'dashboard.stock', kind: 'data', label: 'Stock: low-stock items and materials to prepare' },
    ],
  },
  {
    module: 'clients',
    label: 'Clients',
    items: [
      { key: 'clients.view', kind: 'menu', label: 'Open Clients' },
      { key: 'clients.all', kind: 'data', label: 'See every client (off: only clients of their own projects)' },
      { key: 'clients.create', kind: 'action', label: 'Add new clients and leads' },
      { key: 'clients.edit', kind: 'action', label: 'Edit client details' },
      { key: 'clients.delete', kind: 'action', label: 'Delete clients that have no quotes or sales' },
      { key: 'clients.balances', kind: 'data', label: 'See balances and payment history' },
    ],
  },
  {
    module: 'quotations',
    label: 'Quotations',
    items: [
      { key: 'quotes.view', kind: 'menu', label: 'Open Quotations' },
      { key: 'quotes.all', kind: 'data', label: 'See every quotation (off: only their own and their projects’)' },
      { key: 'quotes.create', kind: 'action', label: 'Start new quotations' },
      { key: 'quotes.edit', kind: 'action', label: 'Edit quotations' },
      { key: 'quotes.prices', kind: 'action', label: 'Set prices and discounts (off: prices come from Inventory)' },
      { key: 'quotes.send', kind: 'action', label: 'Send to the client and mark approved or rejected' },
      { key: 'quotes.costs', kind: 'data', label: 'See cost price and margin per line' },
      { key: 'quotes.delete', kind: 'action', label: 'Delete draft quotations' },
      { key: 'quotes.maxDiscount', kind: 'limit', label: 'Largest discount they can give (%)' },
    ],
  },
  {
    module: 'projects',
    label: 'Projects',
    items: [
      { key: 'projects.view', kind: 'menu', label: 'Open Projects' },
      { key: 'projects.all', kind: 'data', label: 'See every project (off: only projects they’re assigned to)' },
      { key: 'projects.create', kind: 'action', label: 'Start a project from an approved quotation' },
      { key: 'projects.edit', kind: 'action', label: 'Edit project details (name, site, dates)' },
      { key: 'projects.team', kind: 'action', label: 'Assign the designer and installation team' },
      { key: 'projects.stages', kind: 'action', label: 'Move stages and fill in stage details' },
      { key: 'projects.records', kind: 'action', label: 'Add measurements, photos and notes' },
      { key: 'projects.materials', kind: 'action', label: 'Edit materials: add, reserve and issue' },
      { key: 'projects.designs', kind: 'data', label: 'See design files and site photos' },
      { key: 'projects.contact', kind: 'data', label: 'See the client’s contact details' },
      { key: 'projects.billing', kind: 'data', label: 'See quote total, invoices and balance' },
      { key: 'projects.costs', kind: 'data', label: 'See material cost, installation cost and profit' },
    ],
  },
  {
    module: 'pos',
    label: 'POS',
    items: [
      { key: 'pos.view', kind: 'menu', label: 'Open POS' },
      { key: 'pos.sell', kind: 'action', label: 'Ring up sales and take payment' },
      { key: 'pos.discount', kind: 'action', label: 'Give line discounts at the counter' },
      { key: 'pos.prices', kind: 'action', label: 'Change selling prices at the counter' },
      { key: 'pos.void', kind: 'action', label: 'Void sales (stock goes back, invoice cancelled)' },
      { key: 'pos.cashup', kind: 'action', label: 'Close the day (cash-up)' },
    ],
  },
  {
    module: 'inventory',
    label: 'Inventory',
    items: [
      { key: 'inventory.view', kind: 'menu', label: 'Open Inventory' },
      { key: 'inventory.costs', kind: 'data', label: 'See cost prices and margins' },
      { key: 'inventory.value', kind: 'data', label: 'See total stock value' },
      { key: 'inventory.stock', kind: 'action', label: 'Record stock movements (receive, issue, adjust)' },
      { key: 'inventory.alerts', kind: 'action', label: 'Set low-stock alert levels' },
      { key: 'inventory.items', kind: 'action', label: 'Add products and edit product details' },
      { key: 'inventory.prices', kind: 'action', label: 'Set cost and selling prices' },
      { key: 'inventory.delete', kind: 'action', label: 'Delete products that have no history' },
    ],
  },
  {
    module: 'invoices',
    label: 'Invoices and payments',
    items: [
      { key: 'invoices.view', kind: 'menu', label: 'Open Invoices and payments' },
      { key: 'invoices.raise', kind: 'action', label: 'Raise progress invoices' },
      { key: 'invoices.payments', kind: 'action', label: 'Record payments and print receipts' },
      { key: 'invoices.cancel', kind: 'action', label: 'Cancel unpaid progress invoices' },
      { key: 'invoices.totals', kind: 'data', label: 'See money totals (outstanding, overdue, received)' },
    ],
  },
  {
    module: 'staff',
    label: 'Staff',
    items: [
      { key: 'staff.view', kind: 'menu', label: 'Open the Staff list' },
      { key: 'staff.contact', kind: 'data', label: 'See colleagues’ phone numbers and email' },
    ],
  },
]

export const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key))

// The sidebar module each permission group opens, for the menu level.
export const MODULE_VIEW_KEY = {
  dashboard: 'dashboard.view',
  clients: 'clients.view',
  quotations: 'quotes.view',
  projects: 'projects.view',
  pos: 'pos.view',
  inventory: 'inventory.view',
  invoices: 'invoices.view',
  staff: 'staff.view',
}

const on = (...keys) => Object.fromEntries(keys.map((k) => [k, true]))

// Everything on, and no discount limit.
const EVERYTHING = { ...on(...PERMISSION_KEYS), 'quotes.maxDiscount': 100 }

// The suggested defaults from the studio's access guide. The admin can
// change any of these in User settings.
export const DEFAULT_ROLES = [
  {
    id: 'admin',
    label: 'Admin / owner',
    about: 'Runs the business. Sees money, profit and staff settings.',
    locked: true,
    canLogin: true,
    permissions: EVERYTHING,
  },
  {
    id: 'manager',
    label: 'Manager',
    about: 'Runs the branches day to day. Everything except User settings.',
    canLogin: true,
    permissions: EVERYTHING,
  },
  {
    id: 'sales',
    label: 'Sales / front desk',
    about: 'Talks to customers, makes quotes, runs the counter, takes payments.',
    canLogin: true,
    permissions: {
      ...on(
        'dashboard.view',
        'dashboard.sales',
        'clients.view',
        'clients.all',
        'clients.create',
        'clients.edit',
        'clients.balances',
        'quotes.view',
        'quotes.all',
        'quotes.create',
        'quotes.edit',
        'quotes.prices',
        'quotes.send',
        'projects.view',
        'projects.all',
        'projects.create',
        'projects.designs',
        'projects.contact',
        'projects.billing',
        'pos.view',
        'pos.sell',
        'pos.discount',
        'pos.cashup',
        'inventory.view',
        'invoices.view',
        'invoices.raise',
        'invoices.payments',
        'invoices.cancel',
        'staff.view',
        'staff.contact',
      ),
      'quotes.maxDiscount': 5,
    },
  },
  {
    id: 'designer',
    label: 'Designer',
    about: 'Visits sites, measures, designs and moves their own projects forward.',
    canLogin: true,
    permissions: {
      ...on(
        'dashboard.view',
        'dashboard.projects',
        'clients.view',
        'quotes.view',
        'quotes.create',
        'quotes.edit',
        'projects.view',
        'projects.edit',
        'projects.stages',
        'projects.records',
        'projects.designs',
        'projects.contact',
        'inventory.view',
        'staff.view',
        'staff.contact',
      ),
      'quotes.maxDiscount': 0,
    },
  },
  {
    id: 'storekeeper',
    label: 'Storekeeper',
    about: 'Receives stock, keeps counts right and prepares materials for jobs.',
    canLogin: true,
    permissions: {
      ...on(
        'dashboard.view',
        'dashboard.stock',
        'projects.view',
        'projects.all',
        'projects.materials',
        'inventory.view',
        'inventory.stock',
        'inventory.alerts',
        'staff.view',
      ),
      'quotes.maxDiscount': 0,
    },
  },
  {
    id: 'installer',
    label: 'Installer',
    about: 'Fits the work on site. Listed on project teams; no login.',
    canLogin: false,
    permissions: { 'quotes.maxDiscount': 0 },
  },
]

// A role's value for one permission: true/false, or a number for limits.
export function roleAllows(role, key) {
  if (!role) return false
  if (role.locked) return EVERYTHING[key] ?? true
  return role.permissions?.[key] ?? false
}

// How a role's access to a module reads in one word, for the overview table
// in User settings: Full, Edit, View, Own, Materials or —.
export function moduleSummary(role, module) {
  const can = (k) => roleAllows(role, k) === true || (typeof roleAllows(role, k) === 'number' && roleAllows(role, k) > 0)
  if (role.locked) return 'Full'
  switch (module) {
    case 'dashboard': {
      if (!can('dashboard.view')) return '—'
      const parts = ['sales', 'money', 'projects', 'stock'].filter((p) => can(`dashboard.${p}`))
      if (parts.length === 4) return 'Full'
      return parts.length ? parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(', ') : 'Empty'
    }
    case 'clients':
      if (!can('clients.view')) return '—'
      if (!can('clients.all')) return 'Own'
      return can('clients.edit') || can('clients.create') ? (can('clients.delete') ? 'Full' : 'Edit') : 'View'
    case 'quotations':
      if (!can('quotes.view')) return '—'
      if (!can('quotes.all')) return can('quotes.edit') ? 'Own, drafts' : 'Own'
      return can('quotes.edit') ? (can('quotes.delete') ? 'Full' : 'Edit') : 'View'
    case 'projects':
      if (!can('projects.view')) return '—'
      if (!can('projects.all')) return can('projects.stages') ? 'Own, edit' : 'Own'
      if (can('projects.edit') && can('projects.stages') && can('projects.materials')) return 'Full'
      if (can('projects.materials') && !can('projects.stages')) return 'Materials'
      if (can('projects.stages') || can('projects.edit')) return 'Edit'
      return can('projects.create') ? 'View, start new' : 'View'
    case 'pos':
      if (!can('pos.view')) return '—'
      if (can('pos.void') && can('pos.prices')) return 'Full'
      return can('pos.sell') ? 'Sell' : 'View'
    case 'inventory':
      if (!can('inventory.view')) return '—'
      if (can('inventory.prices') && can('inventory.items')) return 'Full'
      return can('inventory.stock') ? 'Edit stock' : 'View'
    case 'invoices':
      if (!can('invoices.view')) return '—'
      if (can('invoices.totals') && can('invoices.cancel')) return 'Full'
      return can('invoices.payments') || can('invoices.raise') ? 'Edit' : 'View'
    case 'staff':
      return can('staff.view') ? 'View' : '—'
    case 'settings':
      return '—'
    default:
      return '—'
  }
}
