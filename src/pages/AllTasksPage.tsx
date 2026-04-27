import { useCallback, useEffect, useMemo, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskFilterBar } from '../components/TaskFilterBar'
import { useDragReorder } from '../hooks/useDragReorder'
import type { Store } from '../hooks/useStore'
import { applyFilter, DEFAULT_FILTER, type FilterState } from '../lib/filterSort'
import { buildTree, descendantsOf, flattenTree } from '../lib/tree'
import type { Task } from '../types'

type Props = {
  store: Store
  onEditTask: (task: Task) => void
}

export function AllTasksPage({ store, onEditTask }: Props) {
  const { boxes, labels, ensureBoxLoaded, getCachedBox, setProgress, removeTask, addTask, reorderTask } =
    store
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

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

  const allTasks: Task[] = useMemo(() => {
    if (!loaded) return []
    const out: Task[] = []
    for (const b of boxes) {
      const cached = getCachedBox(b.id) ?? []
      for (const t of cached) out.push(t)
    }
    return out
  }, [loaded, boxes, getCachedBox])

  const filtered = useMemo(
    () => applyFilter(allTasks, filter, labels),
    [allTasks, filter, labels],
  )

  const builtTree = useMemo(
    () => buildTree(allTasks, filtered),
    [allTasks, filtered],
  )
  const tree = useMemo(
    () => flattenTree(builtTree, (id) => collapsed.has(id)),
    [builtTree, collapsed],
  )
  const childCounts = useMemo(() => {
    const m = new Map<string, number>()
    const walk = (nodes: typeof builtTree) => {
      for (const n of nodes) {
        m.set(n.task.id, n.children.length)
        walk(n.children)
      }
    }
    walk(builtTree)
    return m
  }, [builtTree])

  const boxById = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes])

  const isManual = filter.sort === 'manual'

  const handleReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      // Root-level nodes in the all-tasks view may span multiple boxes.
      // Only reorder within the same box.
      const rootNodes = tree.filter((n) => n.depth === 0)
      const fromTask = rootNodes[fromIdx]
      const toTask = rootNodes[toIdx]
      if (!fromTask || !toTask) return
      if (fromTask.task.boxId !== toTask.task.boxId) return
      const boxId = fromTask.task.boxId
      const cached = getCachedBox(boxId) ?? []
      const rawIdx = cached.findIndex((t) => t.id === toTask.task.id)
      if (rawIdx >= 0) reorderTask(boxId, fromTask.task.id, rawIdx)
    },
    [tree, getCachedBox, reorderTask],
  )

  const { containerRef, dragProps } = useDragReorder({ onReorder: handleReorder })

  let dragIdx = 0

  return (
    <div className="page">
      <TaskFilterBar value={filter} onChange={setFilter} labels={labels} />
      {!loaded ? (
        <p className="empty">読み込み中…</p>
      ) : tree.length === 0 ? (
        <p className="empty">タスクがありません</p>
      ) : (
        <div className="cards" ref={containerRef} {...(isManual ? dragProps : {})}>
          {tree.map((node) => {
            const idx = node.depth === 0 ? dragIdx++ : -1
            return (
              <div key={node.task.id} data-drag-idx={node.depth === 0 ? idx : undefined}>
                <TaskCard
                  task={node.task}
                  labels={labels}
                  box={boxById.get(node.task.boxId)}
                  showBox
                  depth={node.depth}
                  childCount={childCounts.get(node.task.id) ?? 0}
                  collapsed={collapsed.has(node.task.id)}
                  showDragHandle={isManual}
                  onToggleCollapse={() => toggleCollapsed(node.task.id)}
                  onProgress={(p) => setProgress(node.task.boxId, node.task.id, p)}
                  onRemove={() => {
                    const inBox = getCachedBox(node.task.boxId) ?? []
                    const desc = descendantsOf(inBox, node.task.id)
                    if (
                      desc.length === 0 ||
                      confirm(`「${node.task.title}」とその配下 ${desc.length} 件を削除？`)
                    ) {
                      removeTask(node.task.boxId, node.task.id)
                    }
                  }}
                  onEdit={() => onEditTask(node.task)}
                  onAddSub={async (title) => {
                    await addTask({
                      title,
                      description: '',
                      boxId: node.task.boxId,
                      labelIds: [],
                      progress: 0,
                      parentId: node.task.id,
                    })
                    expandTask(node.task.id)
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
