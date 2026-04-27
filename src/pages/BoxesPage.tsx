import { useEffect, useState } from 'react'
import { BoxEditModal } from '../components/BoxEditModal'
import { TaskCard } from '../components/TaskCard'
import { TaskFilterBar } from '../components/TaskFilterBar'
import type { Store } from '../hooks/useStore'
import { applyFilter, DEFAULT_FILTER, type FilterState } from '../lib/filterSort'
import { buildTree, flattenTree } from '../lib/tree'
import type { Box, Task } from '../types'

type Props = {
  store: Store
  onEditTask: (task: Task) => void
}

function deadlineState(deadline: string): { label: string; tone: 'overdue' | 'soon' | 'far' } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(deadline + 'T00:00:00')
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { label: `${-days}日超過`, tone: 'overdue' }
  if (days === 0) return { label: '今日', tone: 'soon' }
  if (days <= 3) return { label: `あと${days}日`, tone: 'soon' }
  return { label: `あと${days}日`, tone: 'far' }
}

export function BoxesPage({ store, onEditTask }: Props) {
  const {
    boxes,
    labels,
    manifest,
    ensureBoxLoaded,
    getCachedBox,
    setProgress,
    removeTask,
    removeBox,
    updateBox,
    addTask,
  } = store
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [editingBox, setEditingBox] = useState<Box | null>(null)
  const [, tick] = useState(0)

  const toggleCollapsed = (id: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const expandTask = (id: string) =>
    setCollapsed((cur) => {
      if (!cur.has(id)) return cur
      const next = new Set(cur)
      next.delete(id)
      return next
    })

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
            const builtTree = cached ? buildTree(cached, filtered) : []
            const tree = flattenTree(builtTree, (id) => collapsed.has(id))
            const childCounts = new Map<string, number>()
            const walkCounts = (nodes: typeof builtTree) => {
              for (const n of nodes) {
                childCounts.set(n.task.id, n.children.length)
                walkCounts(n.children)
              }
            }
            walkCounts(builtTree)
            const dl = b.deadline ? deadlineState(b.deadline) : null
            return (
              <section key={b.id} className="accordion__item">
                <header className="accordion__head">
                  <button className="accordion__toggle" onClick={() => toggle(b.id)}>
                    <span className="accordion__chev">{isOpen ? '▼' : '▶'}</span>
                    <span className="accordion__color" style={{ background: b.color }} />
                    <span className="accordion__name">{b.name}</span>
                    {dl && (
                      <span className={`accordion__deadline accordion__deadline--${dl.tone}`}>
                        {dl.label}
                      </span>
                    )}
                    <span className="accordion__count">{manifest[b.id] ?? 0}</span>
                  </button>
                  <button
                    className="accordion__edit"
                    onClick={() => setEditingBox(b)}
                    aria-label="編集"
                  >
                    ✎
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
                    ) : tree.length === 0 ? (
                      <p className="empty">タスクなし</p>
                    ) : (
                      <div className="cards">
                        {tree.map((node) => (
                            <TaskCard
                              key={node.task.id}
                              task={node.task}
                              labels={labels}
                              depth={node.depth}
                              childCount={childCounts.get(node.task.id) ?? 0}
                              collapsed={collapsed.has(node.task.id)}
                              onToggleCollapse={() => toggleCollapsed(node.task.id)}
                              onProgress={(p) => setProgress(b.id, node.task.id, p)}
                              onRemove={() => {
                                const desc = cached.filter(
                                  (t) =>
                                    t.parentId === node.task.id ||
                                    cached.some(
                                      (a) =>
                                        a.id === t.parentId && a.parentId === node.task.id,
                                    ),
                                )
                                if (
                                  desc.length === 0 ||
                                  confirm(
                                    `「${node.task.title}」とその配下 ${desc.length} 件を削除？`,
                                  )
                                ) {
                                  removeTask(b.id, node.task.id)
                                }
                              }}
                              onEdit={() => onEditTask(node.task)}
                              onAddSub={async (title) => {
                                await addTask({
                                  title,
                                  description: '',
                                  boxId: b.id,
                                  labelIds: [],
                                  progress: 0,
                                  parentId: node.task.id,
                                })
                                expandTask(node.task.id)
                              }}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
      {editingBox && (
        <BoxEditModal
          box={editingBox}
          onClose={() => setEditingBox(null)}
          onSave={(patch) => updateBox(editingBox.id, patch)}
        />
      )}
    </div>
  )
}
