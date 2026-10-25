import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { ALL_BRANCHES } from '../modules.js'
import StaffList from '../staff/StaffList.jsx'
import StaffDetail from '../staff/StaffDetail.jsx'

// The studio's people. View-only: there is deliberately no "add" button.
export default function Staff({ query, branch }) {
  const data = useData()
  const [view, setView] = useState({ mode: 'list' })

  useEffect(() => {
    setView({ mode: 'list' })
  }, [query, branch])

  if (view.mode === 'detail') {
    return <StaffDetail staffId={view.id} onBack={() => setView({ mode: 'list' })} />
  }

  const active = data.staff.filter((p) => p.status === 'Active').length
  const where = branch === ALL_BRANCHES ? 'across both branches' : `at ${branch}`

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={data.staff.length ? `${active} active staff ${where}` : 'Designers, sales officers, storekeepers, managers and installers'}
      />
      <StaffList query={query} branch={branch} onOpen={(id) => setView({ mode: 'detail', id })} />
    </>
  )
}
