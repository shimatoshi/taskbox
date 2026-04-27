import { useState } from 'react'
import type { Box, Label, Task } from '../types'
import { ProgressDial } from './ProgressDial'

type Props = {
  task: Task
  labels: Label[]
  box?: Box
  showBox?: boolean
  depth?: number
  childCount?: number
  collapsed?: boolean
  showDragHandle?: boolean
  onToggleCollapse?: () => void
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
  childCount = 0,
  collapsed = false,
  showDragHandle = false,
  onToggleCollapse,
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
    <div
      className="card"
      style={depth > 0 ? { marginLeft: `${depth * 18}px` } : undefined}
    >
      <div className="card__head">
        {showDragHandle && depth === 0 && (
          <span className="card__drag" data-drag-handle aria-label="並び替え">⠿</span>
        )}
        {depth > 0 && <span className="card__sublink" aria-hidden>↳</span>}
        {childCount > 0 && onToggleCollapse ? (
          <button
            className="card__toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'サブを展開' : 'サブを折りたたむ'}
            title={collapsed ? `サブ ${childCount} 件` : 'サブを折りたたむ'}
          >
            <span className="card__toggle-chev">{collapsed ? '▶' : '▼'}</span>
            <span className="card__toggle-count">{childCount}</span>
          </button>
        ) : null}
        {showBox && box && (
          <span className="card__boxtag" style={{ background: box.color }}>
            {box.name}
          </span>
        )}
        <h3 className="card__title">{task.title}</h3>
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
    </div>
  )
}
