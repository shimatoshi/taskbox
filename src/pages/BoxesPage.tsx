import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskFilterBar } from '../components/TaskFilterBar'
import type { Store } from '../hooks/useStore'
import { applyFilter, DEFAULT_FILTER, type FilterState } from '../lib/filterSort'
import type { Task } from '../types'

type Props = {
  store: Store
  onEditTask: (task: Task) => void
}

export function BoxesPage({ store, onEditTask }: Props) {
  const { boxes, labels, manifest, ensureBoxLoaded, getCachedBox, setProgress, removeTask, removeBox } = store
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [, tick] = useState(0)

  const toggle = async (boxId: string) => {
    const next = new Set(open)
    if (next.has(boxId)) {
      next.delete(boxId)
    } else {
      next.add(boxId)
      if (!getCachedBox(boxId)) {
        await ensureBoxLoaded(boxId)
        tick((n) => n + 1)
      }
    }
    setOpen(next)
  }

  useEffect(() => {
    setOpen((cur) => new Set([...cur].filter((id) => boxes.some((b) => b.id === id))))
  }, [boxes])

  return (
    <div className="page">
      <TaskFilterBar value={filter} onChange={setFilter} labels={labels} />
      {boxes.length === 0 ? (
        <p className="empty">ボックスがありません。「作成」タブから追加してください。</p>
      ) : (
        <div className="accordion">
          {boxes.map((b) => {
            const isOpen = open.has(b.id)
            const cached = getCachedBox(b.id)
            const filtered = cached ? applyFilter(cached, filter, labels) : []
            return (
              <section key={b.id} className="accordion__item">
                <header className="accordion__head">
                  <button className="accordion__toggle" onClick={() => toggle(b.id)}>
                    <span className="accordion__chev">{isOpen ? '▼' : '▶'}</span>
                    <span className="accordion__color" style={{ background: b.color }} />
                    <span className="accordion__name">{b.name}</span>
                    <span className="accordion__count">{manifest[b.id] ?? 0}</span>
                  </button>
                  <button
                    className="accordion__remove"
                    onClick={() => {
                      if (confirm(`「${b.name}」を削除？ 中のタスクも消えます`)) removeBox(b.id)
                    }}
                  >
                    削除
                  </button>
                </header>
                {isOpen && (
                  <div className="accordion__body">
                    {!cached ? (
                      <p className="empty">読み込み中…</p>
                    ) : filtered.length === 0 ? (
                      <p className="empty">タスクなし</p>
                    ) : (
                      <div className="cards">
                        <AnimatePresence>
                          {filtered.map((t) => (
                            <TaskCard
                              key={t.id}
                              task={t}
                              labels={labels}
                              onProgress={(p) => setProgress(b.id, t.id, p)}
                              onRemove={() => removeTask(b.id, t.id)}
                              onEdit={() => onEditTask(t)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
