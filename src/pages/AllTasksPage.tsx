import { useEffect, useMemo, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskFilterBar } from '../components/TaskFilterBar'
import type { Store } from '../hooks/useStore'
import { applyFilter, DEFAULT_FILTER, type FilterState } from '../lib/filterSort'
import { buildTree, descendantsOf, flattenTree } from '../lib/tree'
import type { Task } from '../types'

type Props = {
  store: Store
  onEditTask: (task: Task) => void
}

export function AllTasksPage({ store, onEditTask }: Props) {
  const { boxes, labels, ensureBoxLoaded, getCachedBox, setProgress, removeTask, addTask } =
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

  return (
    <div className="page">
      <TaskFilterBar value={filter} onChange={setFilter} labels={labels} />
      {!loaded ? (
        <p className="empty">読み込み中…</p>
      ) : tree.length === 0 ? (
        <p className="empty">タスクがありません</p>
      ) : (
        <div className="cards">
          {tree.map((node) => (
              <TaskCard
                key={node.task.id}
                task={node.task}
                labels={labels}
                box={boxById.get(node.task.boxId)}
                showBox
                depth={node.depth}
                childCount={childCounts.get(node.task.id) ?? 0}
                collapsed={collapsed.has(node.task.id)}
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
            ))}
        </div>
      )}
    </div>
  )
}
