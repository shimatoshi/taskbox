export type Progress = 0 | 1 | 2 | 3 | 4 | 5

export type Box = {
  id: string
  name: string
  color: string
  createdAt: number
  deadline?: string
}

export type Label = {
  id: string
  name: string
  color: string
}

export type Task = {
  id: string
  title: string
  description: string
  boxId: string
  parentId?: string
  labelIds: string[]
  progress: Progress
  deadline?: string
  createdAt: number
  completedAt?: number
}

export type Manifest = Record<string, number>

export type Tab = 'create' | 'boxes' | 'all'

export type SortKey = 'manual' | 'createdAt' | 'progress' | 'label' | 'title'
