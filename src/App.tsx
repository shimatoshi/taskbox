import { useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { HeaderBar } from './components/HeaderBar'
import { TaskEditModal } from './components/TaskEditModal'
import { useStore } from './hooks/useStore'
import { AllTasksPage } from './pages/AllTasksPage'
import { BoxesPage } from './pages/BoxesPage'
import { CompletedPage } from './pages/CompletedPage'
import { CreatePage } from './pages/CreatePage'
import { LabelsPage } from './pages/LabelsPage'
import { SettingsPage } from './pages/SettingsPage'
import type { Tab, Task } from './types'
import './App.css'

const TITLE: Record<Tab, string> = {
  create: '作成',
  boxes: 'ボックス',
  all: '全タスク',
}

type Overlay = 'completed' | 'settings' | 'labels' | null

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('create')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [editing, setEditing] = useState<Task | null>(null)

  if (!store.ready) {
    return (
      <div className="app">
        <p className="empty">起動中…</p>
      </div>
    )
  }

  if (overlay === 'completed') {
    return (
      <div className="app">
        <CompletedPage store={store} onBack={() => setOverlay(null)} />
      </div>
    )
  }

  if (overlay === 'settings') {
    return (
      <div className="app">
        <SettingsPage onBack={() => setOverlay(null)} />
      </div>
    )
  }

  if (overlay === 'labels') {
    return (
      <div className="app">
        <LabelsPage store={store} onBack={() => setOverlay(null)} />
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
          setOverlay('completed')
        }}
        onOpenSettings={() => setOverlay('settings')}
      />
      <main className="main">
        {tab === 'create' && (
          <CreatePage
            store={store}
            onOpenLabels={() => setOverlay('labels')}
            onEditTask={setEditing}
          />
        )}
        {tab === 'boxes' && <BoxesPage store={store} onEditTask={setEditing} />}
        {tab === 'all' && <AllTasksPage store={store} onEditTask={setEditing} />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
      {editing && (
        <TaskEditModal
          task={editing}
          boxes={store.boxes}
          labels={store.labels}
          onClose={() => setEditing(null)}
          onSave={async (next) => {
            await store.moveTask(editing.boxId, next.boxId, editing.id, {
              title: next.title,
              description: next.description,
              labelIds: next.labelIds,
              deadline: next.deadline,
            })
          }}
        />
      )}
    </div>
  )
}
