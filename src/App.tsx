import { useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { HeaderBar } from './components/HeaderBar'
import { useStore } from './hooks/useStore'
import { AllTasksPage } from './pages/AllTasksPage'
import { BoxesPage } from './pages/BoxesPage'
import { CompletedPage } from './pages/CompletedPage'
import { CreatePage } from './pages/CreatePage'
import type { Tab } from './types'
import './App.css'

const TITLE: Record<Tab, string> = {
  create: '作成',
  boxes: 'ボックス',
  all: '全タスク',
}

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('create')
  const [showCompleted, setShowCompleted] = useState(false)

  if (!store.ready) {
    return (
      <div className="app">
        <p className="empty">起動中…</p>
      </div>
    )
  }

  if (showCompleted) {
    return (
      <div className="app">
        <CompletedPage store={store} onBack={() => setShowCompleted(false)} />
      </div>
    )
  }

  return (
    <div className="app">
      <HeaderBar
        title={TITLE[tab]}
        completedCount={store.completed?.length ?? null}
        onOpenCompleted={() => {
          store.ensureCompletedLoaded()
          setShowCompleted(true)
        }}
      />
      <main className="main">
        {tab === 'create' && <CreatePage store={store} />}
        {tab === 'boxes' && <BoxesPage store={store} />}
        {tab === 'all' && <AllTasksPage store={store} />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
