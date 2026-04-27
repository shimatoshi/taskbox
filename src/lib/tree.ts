import type { Task } from '../types'

export type TreeNode = {
  task: Task
  depth: number
  children: TreeNode[]
}

export function descendantsOf(tasks: Task[], parentId: string): Task[] {
  const byParent = new Map<string | undefined, Task[]>()
  for (const t of tasks) {
    const arr = byParent.get(t.parentId) ?? []
    arr.push(t)
    byParent.set(t.parentId, arr)
  }
  const out: Task[] = []
  const stack: string[] = [parentId]
  while (stack.length) {
    const id = stack.pop()!
    const kids = byParent.get(id) ?? []
    for (const k of kids) {
      out.push(k)
      stack.push(k.id)
    }
  }
  return out
}

export function isDescendantOf(
  tasks: Task[],
  candidateAncestor: string,
  target: string,
): boolean {
  let cur: string | undefined = target
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) return false
    seen.add(cur)
    if (cur === candidateAncestor) return true
    cur = byId.get(cur)?.parentId
  }
  return false
}

export function buildTree(allTasks: Task[], visibleInOrder: Task[]): TreeNode[] {
  const allById = new Map(allTasks.map((t) => [t.id, t]))
  const visibleSet = new Set(visibleInOrder.map((t) => t.id))

  const parentKeyFor = (t: Task): string | undefined => {
    let cur = t.parentId ? allById.get(t.parentId) : undefined
    while (cur) {
      if (visibleSet.has(cur.id)) return cur.id
      cur = cur.parentId ? allById.get(cur.parentId) : undefined
    }
    return undefined
  }

  const childrenByKey = new Map<string | undefined, Task[]>()
  for (const t of visibleInOrder) {
    const key = parentKeyFor(t)
    const arr = childrenByKey.get(key) ?? []
    arr.push(t)
    childrenByKey.set(key, arr)
  }

  const build = (parentKey: string | undefined, depth: number): TreeNode[] => {
    const list = childrenByKey.get(parentKey) ?? []
    return list.map((task) => ({
      task,
      depth,
      children: build(task.id, depth + 1),
    }))
  }
  return build(undefined, 0)
}

export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = []
  const walk = (n: TreeNode) => {
    out.push(n)
    n.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}
