import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [toast, setToast] = useState<string | null>(null)
  const inboxProcessed = useRef(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Process URL inbox params (?add=TITLE&box=BOX_NAME&desc=DESC)
  useEffect(() => {
    if (!store.ready || inboxProcessed.current) return
    inboxProcessed.current = true
    const params = new URLSearchParams(window.location.search)
    const title = params.get('add')
    if (!title) return

    const boxName = params.get('box')
    const desc = params.get('desc') ?? ''

    // Clear URL params immediately
    window.history.replaceState({}, '', window.location.pathname)

    ;(async () => {
      let targetBox = store.boxes.find(
        (b) => b.name === boxName || b.name.toLowerCase() === boxName?.toLowerCase(),
      )
      if (!targetBox && boxName) {
        targetBox = await store.addBox(boxName)
      }
      if (!targetBox) {
        targetBox = store.boxes[0]
      }
      if (!targetBox) {
        targetBox = await store.addBox('Inbox')
      }

      await store.addTask({
        title,
        description: desc,
        boxId: targetBox.id,
        labelIds: [],
        progress: 0,
      })
      showToast(`追加: ${title}`)
    })()
  }, [store, showToast])

  useEffect(() => {
    if (editing) {
      store.ensureAllBoxesLoaded()
    }
  }, [editing, store])

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
      {toast && <div className="toast">{toast}</div>}
      {editing && (
        <TaskEditModal
          task={editing}
          boxes={store.boxes}
          labels={store.labels}
          candidateParents={store.getAllCachedTasks()}
          onClose={() => setEditing(null)}
          onSave={async (next) => {
            await store.moveTask(editing.boxId, next.boxId, editing.id, {
              title: next.title,
              description: next.description,
              parentId: next.parentId,
              labelIds: next.labelIds,
              deadline: next.deadline,
            })
          }}
        />
      )}
    </div>
  )
}
