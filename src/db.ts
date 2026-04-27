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
