import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskFilterBar } from '../components/TaskFilterBar'
import type { Store } from '../hooks/useStore'
import { applyFilter, DEFAULT_FILTER, type FilterState } from '../lib/filterSort'
import type { Task } from '../types'

type Props = { store: Store }

export function AllTasksPage({ store }: Props) {
  const { boxes, labels, ensureBoxLoaded, getCachedBox, setProgress, removeTask } = store
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.all(boxes.map((b) => ensureBoxLoaded(b.id)))
      if (!cancelled) setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [boxes, ensureBoxLoaded])

  const allTasks: { task: Task; boxId: string }[] = useMemo(() => {
    if (!loaded) return []
    const out: { task: Task; boxId: string }[] = []
    for (const b of boxes) {
      const cached = getCachedBox(b.id) ?? []
      for (const t of cached) out.push({ task: t, boxId: b.id })
    }
    return out
  }, [loaded, boxes, getCachedBox])

  const filtered = useMemo(
    () => applyFilter(allTasks.map((x) => x.task), filter, labels),
    [allTasks, filter, labels],
  )

  const boxById = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes])

  return (
    <div className="page">
      <TaskFilterBar value={filter} onChange={setFilter} labels={labels} />
      {!loaded ? (
        <p className="empty">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="empty">タスクがありません</p>
      ) : (
        <div className="cards">
          <AnimatePresence>
            {filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                labels={labels}
                box={boxById.get(t.boxId)}
                showBox
                onProgress={(p) => setProgress(t.boxId, t.id, p)}
                onRemove={() => removeTask(t.boxId, t.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
