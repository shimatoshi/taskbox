import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadBoxes,
  loadCompleted,
  loadLabels,
  loadManifest,
  loadBoxTasks,
  requestPersistence,
  saveBoxes,
  saveBoxTasks,
  saveCompleted,
  saveLabels,
  saveManifest,
  dropBoxTasks,
} from '../db'
import { descendantsOf } from '../lib/tree'
import type { Box, Label, Manifest, Progress, Task } from '../types'

const DEFAULT_BOX_COLORS = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185']
const DEFAULT_LABEL_COLORS = ['#94a3b8', '#22d3ee', '#a3e635', '#f59e0b', '#f87171', '#c084fc']

function pickColor(palette: string[], existing: { color: string }[]): string {
  const used = new Set(existing.map((x) => x.color))
  return palette.find((c) => !used.has(c)) ?? palette[existing.length % palette.length]
}

export function useStore() {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [manifest, setManifest] = useState<Manifest>({})
  const [completed, setCompleted] = useState<Task[] | null>(null)
  const [ready, setReady] = useState(false)

  const boxCache = useRef<Map<string, Task[]>>(new Map())
  const [, forceRender] = useState(0)
  const bump = () => forceRender((n) => n + 1)

  useEffect(() => {
    ;(async () => {
      const [b, l, m] = await Promise.all([loadBoxes(), loadLabels(), loadManifest()])
      setBoxes(b)
      setLabels(l)
      setManifest(m)
      setReady(true)
      requestPersistence().then((ok) => console.log('[taskbox] persistence:', ok))
    })()
  }, [])

  const ensureBoxLoaded = useCallback(async (boxId: string): Promise<Task[]> => {
    const cached = boxCache.current.get(boxId)
    if (cached) return cached
    const tasks = await loadBoxTasks(boxId)
    boxCache.current.set(boxId, tasks)
    bump()
    return tasks
  }, [])

  const getCachedBox = useCallback((boxId: string): Task[] | undefined => {
    return boxCache.current.get(boxId)
  }, [])

  const ensureAllBoxesLoaded = useCallback(async () => {
    await Promise.all(
      boxes.map((b) =>
        boxCache.current.has(b.id) ? Promise.resolve() : ensureBoxLoaded(b.id),
      ),
    )
  }, [boxes, ensureBoxLoaded])

  const getAllCachedTasks = useCallback((): Task[] => {
    const out: Task[] = []
    for (const b of boxes) {
      const cached = boxCache.current.get(b.id)
      if (cached) out.push(...cached)
    }
    return out
  }, [boxes])

  const ensureCompletedLoaded = useCallback(async () => {
    if (completed) return completed
    const c = await loadCompleted()
    setCompleted(c)
    return c
  }, [completed])

  const writeBox = async (boxId: string, tasks: Task[]) => {
    boxCache.current.set(boxId, tasks)
    await saveBoxTasks(boxId, tasks)
    const next = { ...manifest, [boxId]: tasks.length }
    setManifest(next)
    await saveManifest(next)
    bump()
  }

  const addBox = async (name: string) => {
    const box: Box = {
      id: crypto.randomUUID(),
      name,
      color: pickColor(DEFAULT_BOX_COLORS, boxes),
      createdAt: Date.now(),
    }
    const next = [...boxes, box]
    setBoxes(next)
    await saveBoxes(next)
    return box
  }

  const updateBox = async (boxId: string, patch: Partial<Box>) => {
    const next = boxes.map((b) => (b.id === boxId ? { ...b, ...patch } : b))
    setBoxes(next)
    await saveBoxes(next)
  }

  const removeBox = async (boxId: string) => {
    const next = boxes.filter((b) => b.id !== boxId)
    setBoxes(next)
    await saveBoxes(next)
    boxCache.current.delete(boxId)
    await dropBoxTasks(boxId)
    const m = { ...manifest }
    delete m[boxId]
    setManifest(m)
    await saveManifest(m)
  }

  const addLabel = async (name: string) => {
    const label: Label = {
      id: crypto.randomUUID(),
      name,
      color: pickColor(DEFAULT_LABEL_COLORS, labels),
    }
    const next = [...labels, label]
    setLabels(next)
    await saveLabels(next)
    return label
  }

  const updateLabel = async (labelId: string, patch: Partial<Label>) => {
    const next = labels.map((l) => (l.id === labelId ? { ...l, ...patch } : l))
    setLabels(next)
    await saveLabels(next)
  }

  const removeLabel = async (labelId: string) => {
    const next = labels.filter((l) => l.id !== labelId)
    setLabels(next)
    await saveLabels(next)
  }

  const addTask = async (input: {
    title: string
    description: string
    boxId: string
    labelIds: string[]
    progress: Progress
    deadline?: string
    parentId?: string
  }) => {
    const task: Task = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    const current = await ensureBoxLoaded(input.boxId)
    await writeBox(input.boxId, [...current, task])
  }

  const updateTask = async (boxId: string, taskId: string, patch: Partial<Task>) => {
    const current = await ensureBoxLoaded(boxId)
    const next = current.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    await writeBox(boxId, next)
  }

  const removeTask = async (boxId: string, taskId: string) => {
    const current = await ensureBoxLoaded(boxId)
    const target = current.find((t) => t.id === taskId)
    if (!target) return
    const desc = descendantsOf(current, taskId)
    const drop = new Set([taskId, ...desc.map((d) => d.id)])
    await writeBox(boxId, current.filter((t) => !drop.has(t.id)))
  }

  const moveTask = async (
    fromBoxId: string,
    toBoxId: string,
    taskId: string,
    patch: Partial<Task> = {},
  ) => {
    if (fromBoxId === toBoxId) {
      await updateTask(fromBoxId, taskId, patch)
      return
    }
    const fromList = await ensureBoxLoaded(fromBoxId)
    const target = fromList.find((t) => t.id === taskId)
    if (!target) return
    const desc = descendantsOf(fromList, taskId)
    const moveSet = new Set([taskId, ...desc.map((d) => d.id)])
    const remaining = fromList.filter((t) => !moveSet.has(t.id))
    await writeBox(fromBoxId, remaining)

    const toList = await ensureBoxLoaded(toBoxId)
    const movedTarget: Task = { ...target, ...patch, boxId: toBoxId }
    const movedDesc: Task[] = desc.map((d) => ({ ...d, boxId: toBoxId }))
    await writeBox(toBoxId, [...toList, movedTarget, ...movedDesc])
  }

  const reorderTask = async (boxId: string, taskId: string, targetIndex: number) => {
    const current = await ensureBoxLoaded(boxId)
    const fromIndex = current.findIndex((t) => t.id === taskId)
    if (fromIndex < 0 || fromIndex === targetIndex) return
    const next = [...current]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, moved)
    await writeBox(boxId, next)
  }

  const setProgress = async (boxId: string, taskId: string, progress: Progress) => {
    if (progress < 5) {
      await updateTask(boxId, taskId, { progress })
      return
    }
    await completeTaskAndDescendants(boxId, taskId)
    await maybeCascadeUp(boxId, taskId)
  }

  const completeTaskAndDescendants = async (boxId: string, taskId: string) => {
    const current = await ensureBoxLoaded(boxId)
    const target = current.find((t) => t.id === taskId)
    if (!target) return
    const desc = descendantsOf(current, taskId)
    const ids = new Set([taskId, ...desc.map((d) => d.id)])
    const now = Date.now()
    const movedTarget: Task = { ...target, progress: 5, completedAt: now }
    const movedDesc: Task[] = desc.map((d) => ({ ...d, completedAt: now }))
    const remaining = current.filter((t) => !ids.has(t.id))
    await writeBox(boxId, remaining)
    const c = await ensureCompletedLoaded()
    const nextCompleted = [movedTarget, ...movedDesc, ...c]
    setCompleted(nextCompleted)
    await saveCompleted(nextCompleted)
  }

  const maybeCascadeUp = async (boxId: string, justCompletedId: string) => {
    const justCompleted = (await ensureCompletedLoaded()).find((t) => t.id === justCompletedId)
    const parentId = justCompleted?.parentId
    if (!parentId) return
    const current = await ensureBoxLoaded(boxId)
    const parent = current.find((t) => t.id === parentId)
    if (!parent) return
    const remainingChildren = current.filter((t) => t.parentId === parentId)
    if (remainingChildren.length > 0) return
    await completeTaskAndDescendants(boxId, parentId)
    await maybeCascadeUp(boxId, parentId)
  }

  const restoreFromCompleted = async (taskId: string, includeDescendants = true) => {
    if (!completed) return
    const target = completed.find((t) => t.id === taskId)
    if (!target) return
    const desc = includeDescendants ? descendantsOf(completed, taskId) : []
    const ids = new Set([taskId, ...desc.map((d) => d.id)])
    const nextCompleted = completed.filter((t) => !ids.has(t.id))
    setCompleted(nextCompleted)
    await saveCompleted(nextCompleted)

    const byBox = new Map<string, Task[]>()
    const restoreOne = (t: Task) => {
      const restored: Task =
        t.id === taskId
          ? { ...t, progress: 0, completedAt: undefined }
          : { ...t, completedAt: undefined }
      const arr = byBox.get(t.boxId) ?? []
      arr.push(restored)
      byBox.set(t.boxId, arr)
    }
    restoreOne(target)
    desc.forEach(restoreOne)

    for (const [bId, additions] of byBox) {
      const cur = await ensureBoxLoaded(bId)
      await writeBox(bId, [...cur, ...additions])
    }
  }

  const purgeCompleted = async (taskId: string) => {
    if (!completed) return
    const next = completed.filter((t) => t.id !== taskId)
    setCompleted(next)
    await saveCompleted(next)
  }

  return {
    ready,
    boxes,
    labels,
    manifest,
    completed,
    addBox,
    updateBox,
    removeBox,
    addLabel,
    updateLabel,
    removeLabel,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    reorderTask,
    setProgress,
    ensureBoxLoaded,
    getCachedBox,
    ensureAllBoxesLoaded,
    getAllCachedTasks,
    ensureCompletedLoaded,
    restoreFromCompleted,
    purgeCompleted,
  }
}

export type Store = ReturnType<typeof useStore>
