import { motion } from 'framer-motion'
import type { Box, Label, Task } from '../types'
import { ProgressDial } from './ProgressDial'

type Props = {
  task: Task
  labels: Label[]
  box?: Box
  showBox?: boolean
  onProgress: (next: Task['progress']) => void
  onRemove: () => void
}

export function TaskCard({ task, labels, box, showBox, onProgress, onRemove }: Props) {
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="card"
    >
      <div className="card__head">
        {showBox && box && (
          <span className="card__boxtag" style={{ background: box.color }}>
            {box.name}
          </span>
        )}
        <h3 className="card__title">{task.title}</h3>
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
    </motion.div>
  )
}
