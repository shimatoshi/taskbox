import { del, get, set } from 'idb-keyval'
import type { Box, Label, Manifest, Task } from './types'

const KEY = {
  boxes: 'taskbox.boxes.v1',
  labels: 'taskbox.labels.v1',
  manifest: 'taskbox.manifest.v1',
  completed: 'taskbox.completed.v1',
  box: (id: string) => `taskbox.box.${id}.v1`,
}

export async function loadBoxes(): Promise<Box[]> {
  return (await get<Box[]>(KEY.boxes)) ?? []
}
export async function saveBoxes(v: Box[]) {
  await set(KEY.boxes, v)
}

export async function loadLabels(): Promise<Label[]> {
  return (await get<Label[]>(KEY.labels)) ?? []
}
export async function saveLabels(v: Label[]) {
  await set(KEY.labels, v)
}

export async function loadManifest(): Promise<Manifest> {
  return (await get<Manifest>(KEY.manifest)) ?? {}
}
export async function saveManifest(v: Manifest) {
  await set(KEY.manifest, v)
}

export async function loadBoxTasks(boxId: string): Promise<Task[]> {
  return (await get<Task[]>(KEY.box(boxId))) ?? []
}
export async function saveBoxTasks(boxId: string, v: Task[]) {
  await set(KEY.box(boxId), v)
}
export async function dropBoxTasks(boxId: string) {
  await del(KEY.box(boxId))
}

export async function loadCompleted(): Promise<Task[]> {
  return (await get<Task[]>(KEY.completed)) ?? []
}
export async function saveCompleted(v: Task[]) {
  await set(KEY.completed, v)
}

export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export type BackupV1 = {
  version: 1
  exportedAt: string
  boxes: Box[]
  labels: Label[]
  manifest: Manifest
  boxTasks: Record<string, Task[]>
  completed: Task[]
}

export async function exportAll(): Promise<BackupV1> {
  const boxes = await loadBoxes()
  const labels = await loadLabels()
  const manifest = await loadManifest()
  const completed = await loadCompleted()
  const boxTasks: Record<string, Task[]> = {}
  for (const b of boxes) {
    boxTasks[b.id] = await loadBoxTasks(b.id)
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    boxes,
    labels,
    manifest,
    boxTasks,
    completed,
  }
}

export function isBackup(v: unknown): v is BackupV1 {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    o.version === 1 &&
    Array.isArray(o.boxes) &&
    Array.isArray(o.labels) &&
    typeof o.manifest === 'object' &&
    typeof o.boxTasks === 'object' &&
    Array.isArray(o.completed)
  )
}

export async function importAll(data: BackupV1) {
  const existingBoxes = await loadBoxes()
  for (const b of existingBoxes) {
    await dropBoxTasks(b.id)
  }
  await saveBoxes(data.boxes)
  await saveLabels(data.labels)
  await saveManifest(data.manifest)
  await saveCompleted(data.completed)
  for (const b of data.boxes) {
    const tasks = data.boxTasks[b.id] ?? []
    await saveBoxTasks(b.id, tasks)
  }
}
