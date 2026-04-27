import { useEffect, useState } from 'react'
import type { Box } from '../types'

const PALETTE = [
  '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185',
  '#94a3b8', '#22d3ee', '#a3e635', '#f59e0b', '#f87171', '#c084fc',
]

type Props = {
  box: Box
  onSave: (patch: Partial<Box>) => Promise<void> | void
  onClose: () => void
}

export function BoxEditModal({ box, onSave, onClose }: Props) {
  const [name, setName] = useState(box.name)
  const [color, setColor] = useState(box.color)
  const [deadline, setDeadline] = useState(box.deadline ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        color,
        deadline: deadline || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h3>ボックスを編集</h3>
          <button className="modal__x" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="modal__body">
          <div className="draftcard__field">
            <label>名前</label>
            <input
              className="draftcard__title"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="draftcard__field">
            <label>色</label>
            <div className="labels__palette">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`labels__color ${c === color ? 'is-active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`色 ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="draftcard__field">
            <label>期限</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <footer className="modal__foot">
          <button className="modal__cancel" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="draftcard__submit"
            onClick={save}
            disabled={!name.trim() || saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </footer>
      </div>
    </div>
  )
}
