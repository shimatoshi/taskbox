import { useCallback, useEffect, useState } from 'react'
import { BoxEditModal } from '../components/BoxEditModal'
import { TaskCard } from '../components/TaskCard'
import { TaskFilterBar } from '../components/TaskFilterBar'
import { useDragReorder } from '../hooks/useDragReorder'
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
    reorderTask,
  } = store
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [editingBox, setEditingBox] = useState<Box | null>(null)
  const [, tick] = useState(0)

  const toggleExpanded = (id: string) =>
    setExpanded((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const expandTask = (id: string) =>
    setExpanded((cur) => {
      if (cur.has(id)) return cur
      const next = new Set(cur)
      next.add(id)
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
            const tree = flattenTree(builtTree, (id) => !expanded.has(id))
            const descendantCounts = new Map<string, number>()
            const countDesc = (node: { task: { id: string }; children: typeof builtTree }): number => {
              let total = 0
              for (const child of node.children) {
                total += 1 + countDesc(child)
              }
              descendantCounts.set(node.task.id, total)
              return total
            }
            for (const n of builtTree) countDesc(n)
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
                      <BoxCardList
                        boxId={b.id}
                        tree={tree}
                        cached={cached}
                        labels={labels}
                        descendantCounts={descendantCounts}
                        expanded={expanded}
                        isManual={filter.sort === 'manual'}
                        onToggleExpand={toggleExpanded}
                        onProgress={(taskId, p) => setProgress(b.id, taskId, p)}
                        onRemove={(taskId) => {
                          const node = tree.find((n) => n.task.id === taskId)
                          if (!node) return
                          const desc = cached.filter(
                            (t) =>
                              t.parentId === taskId ||
                              cached.some(
                                (a) =>
                                  a.id === t.parentId && a.parentId === taskId,
                              ),
                          )
                          if (
                            desc.length === 0 ||
                            confirm(
                              `「${node.task.title}」とその配下 ${desc.length} 件を削除？`,
                            )
                          ) {
                            removeTask(b.id, taskId)
                          }
                        }}
                        onEdit={(task) => onEditTask(task)}
                        onAddSub={async (parentId, title) => {
                          await addTask({
                            title,
                            description: '',
                            boxId: b.id,
                            labelIds: [],
                            progress: 0,
                            parentId,
                          })
                          expandTask(parentId)
                        }}
                        onReorder={(fromIdx, toIdx) => {
                          const fromNode = tree[fromIdx]
                          const toNode = tree[toIdx]
                          if (!fromNode || !toNode) return
                          if (fromNode.task.parentId !== toNode.task.parentId) return
                          const rawIdx = cached.findIndex((t) => t.id === toNode.task.id)
                          if (rawIdx >= 0) reorderTask(b.id, fromNode.task.id, rawIdx)
                        }}
                      />
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

type BoxCardListProps = {
  boxId: string
  tree: ReturnType<typeof flattenTree>
  cached: Task[]
  labels: import('../types').Label[]
  descendantCounts: Map<string, number>
  expanded: Set<string>
  isManual: boolean
  onToggleExpand: (id: string) => void
  onProgress: (taskId: string, p: Task['progress']) => void
  onRemove: (taskId: string) => void
  onEdit: (task: Task) => void
  onAddSub: (parentId: string, title: string) => void
  onReorder: (fromIdx: number, toIdx: number) => void
}

function BoxCardList({
  tree,
  labels,
  descendantCounts,
  expanded,
  isManual,
  onToggleExpand,
  onProgress,
  onRemove,
  onEdit,
  onAddSub,
  onReorder,
}: BoxCardListProps) {
  const handleReorder = useCallback(
    (from: number, to: number) => onReorder(from, to),
    [onReorder],
  )
  const { containerRef, dragProps } = useDragReorder({ onReorder: handleReorder })

  return (
    <div className="cards" ref={containerRef} {...(isManual ? dragProps : {})}>
      {tree.map((node, idx) => (
        <div key={node.task.id} data-drag-idx={idx}>
          <TaskCard
            task={node.task}
            labels={labels}
            depth={node.depth}
            childCount={descendantCounts.get(node.task.id) ?? 0}
            collapsed={!expanded.has(node.task.id)}
            showDragHandle={isManual}
            onToggleCollapse={() => onToggleExpand(node.task.id)}
            onProgress={(p) => onProgress(node.task.id, p)}
            onRemove={() => onRemove(node.task.id)}
            onEdit={() => onEdit(node.task)}
            onAddSub={async (title) => onAddSub(node.task.id, title)}
          />
        </div>
      ))}
    </div>
  )
}
