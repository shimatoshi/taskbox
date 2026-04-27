import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Box, Label, Task } from '../types'
import { ProgressDial } from './ProgressDial'

type Props = {
  task: Task
  labels: Label[]
  box?: Box
  showBox?: boolean
  depth?: number
  childSummary?: { done: number; total: number }
  onProgress: (next: Task['progress']) => void
  onRemove: () => void
  onEdit: () => void
  onAddSub?: (title: string) => Promise<void> | void
}

export function TaskCard({
  task,
  labels,
  box,
  showBox,
  depth = 0,
  childSummary,
  onProgress,
  onRemove,
  onEdit,
  onAddSub,
}: Props) {
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id))
  const [adding, setAdding] = useState(false)
  const [subTitle, setSubTitle] = useState('')

  const submitSub = async () => {
    const v = subTitle.trim()
    if (!v || !onAddSub) return
    await onAddSub(v)
    setSubTitle('')
    setAdding(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="card"
      style={depth > 0 ? { marginLeft: `${depth * 18}px` } : undefined}
    >
      <div className="card__head">
        {depth > 0 && <span className="card__sublink" aria-hidden>↳</span>}
        {showBox && box && (
          <span className="card__boxtag" style={{ background: box.color }}>
            {box.name}
          </span>
        )}
        <h3 className="card__title">{task.title}</h3>
        {childSummary && childSummary.total > 0 && (
          <span className="card__substat" title="サブタスク完了数 / 全数">
            ✓{childSummary.done}/{childSummary.total}
          </span>
        )}
        <button className="card__edit" onClick={onEdit} aria-label="編集">
          ✎
        </button>
        <button className="card__x" onClick={onRemove} aria-label="削除">
          ×
        </button>
      </div>
      {task.description && <p className="card__desc">{task.description}</p>}
      {(taskLabels.length > 0 || task.deadline) && (
        <div className="card__meta">
          {taskLabels.map((l) => (
            <span key={l.id} className="card__label" style={{ color: l.color, borderColor: l.color }}>
              #{l.name}
            </span>
          ))}
          {task.deadline && <span className="card__deadline">⏰ {task.deadline}</span>}
        </div>
      )}
      <ProgressDial value={task.progress} onChange={onProgress} />
      {onAddSub && (
        adding ? (
          <div className="card__subadd">
            <input
              autoFocus
              placeholder="サブタスクのタイトル"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSub()
                if (e.key === 'Escape') {
                  setAdding(false)
                  setSubTitle('')
                }
              }}
            />
            <button onClick={submitSub}>追加</button>
            <button
              className="card__subadd-cancel"
              onClick={() => {
                setAdding(false)
                setSubTitle('')
              }}
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button className="card__subadd-btn" onClick={() => setAdding(true)}>
            + サブ
          </button>
        )
      )}
    </motion.div>
  )
}
