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
    await writeBox(boxId, current.filter((t) => t.id !== taskId))
  }

  const setProgress = async (boxId: string, taskId: string, progress: Progress) => {
    if (progress < 5) {
      await updateTask(boxId, taskId, { progress })
      return
    }
    const current = await ensureBoxLoaded(boxId)
    const target = current.find((t) => t.id === taskId)
    if (!target) return
    const moved: Task = { ...target, progress: 5, completedAt: Date.now() }
    const remaining = current.filter((t) => t.id !== taskId)
    await writeBox(boxId, remaining)
    const c = await ensureCompletedLoaded()
    const nextCompleted = [moved, ...c]
    setCompleted(nextCompleted)
    await saveCompleted(nextCompleted)
  }

  const restoreFromCompleted = async (taskId: string) => {
    if (!completed) return
    const target = completed.find((t) => t.id === taskId)
    if (!target) return
    const nextCompleted = completed.filter((t) => t.id !== taskId)
    setCompleted(nextCompleted)
    await saveCompleted(nextCompleted)
    const restored: Task = { ...target, progress: 0, completedAt: undefined }
    const current = await ensureBoxLoaded(target.boxId)
    await writeBox(target.boxId, [...current, restored])
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
    removeBox,
    addLabel,
    removeLabel,
    addTask,
    updateTask,
    removeTask,
    setProgress,
    ensureBoxLoaded,
    getCachedBox,
    ensureCompletedLoaded,
    restoreFromCompleted,
    purgeCompleted,
  }
}

export type Store = ReturnType<typeof useStore>
