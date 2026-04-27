import type { Label, SortKey, Task } from '../types'

export type FilterState = {
  sort: SortKey
  query: string
  labelIds: string[]
}

export const DEFAULT_FILTER: FilterState = {
  sort: 'manual',
  query: '',
  labelIds: [],
}

export function applyFilter(
  tasks: Task[],
  filter: FilterState,
  labels: Label[],
): Task[] {
  const q = filter.query.trim().toLowerCase()
  let out = tasks
  if (q) {
    out = out.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    )
  }
  if (filter.labelIds.length > 0) {
    const wanted = new Set(filter.labelIds)
    out = out.filter((t) => t.labelIds.some((id) => wanted.has(id)))
  }
  return sortTasks(out, filter.sort, labels)
}

function sortTasks(tasks: Task[], key: SortKey, labels: Label[]): Task[] {
  if (key === 'manual') return tasks
  const copy = [...tasks]
  if (key === 'createdAt') {
    copy.sort((a, b) => b.createdAt - a.createdAt)
  } else if (key === 'progress') {
    copy.sort((a, b) => a.progress - b.progress)
  } else if (key === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title, 'ja'))
  } else if (key === 'label') {
    const labelName = (id?: string) =>
      id ? labels.find((l) => l.id === id)?.name ?? '' : ''
    copy.sort((a, b) => {
      const an = labelName(a.labelIds[0])
      const bn = labelName(b.labelIds[0])
      if (!an && !bn) return 0
      if (!an) return 1
      if (!bn) return -1
      return an.localeCompare(bn, 'ja')
    })
  }
  return copy
}
