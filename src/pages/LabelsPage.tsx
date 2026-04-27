import { useState } from 'react'
import type { Store } from '../hooks/useStore'

type Props = {
  store: Store
  onBack: () => void
}

const PALETTE = [
  '#94a3b8', '#22d3ee', '#a3e635', '#f59e0b', '#f87171', '#c084fc',
  '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185',
]

export function LabelsPage({ store, onBack }: Props) {
  const { labels, updateLabel, removeLabel } = store
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const startRename = (id: string, current: string) => {
    setEditingId(id)
    setDraftName(current)
  }

  const commitRename = async () => {
    if (!editingId) return
    const v = draftName.trim()
    if (v) await updateLabel(editingId, { name: v })
    setEditingId(null)
    setDraftName('')
  }

  return (
    <div className="page">
      <header className="completed__head">
        <button className="completed__back" onClick={onBack}>
          ← 戻る
        </button>
        <h2>ラベル管理</h2>
      </header>

      {labels.length === 0 ? (
        <p className="empty">ラベルがありません</p>
      ) : (
        <ul className="labels__list">
          {labels.map((l) => {
            const isEditing = editingId === l.id
            return (
              <li key={l.id} className="labels__item">
                <span
                  className="labels__swatch"
                  style={{ background: l.color }}
                  aria-hidden
                />
                <div className="labels__main">
                  {isEditing ? (
                    <input
                      autoFocus
                      className="labels__input"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setDraftName('')
                        }
                      }}
                      onBlur={commitRename}
                    />
                  ) : (
                    <button
                      className="labels__name"
                      onClick={() => startRename(l.id, l.name)}
                    >
                      #{l.name}
                    </button>
                  )}
                  <div className="labels__palette">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        className={`labels__color ${c === l.color ? 'is-active' : ''}`}
                        style={{ background: c }}
                        onClick={() => updateLabel(l.id, { color: c })}
                        aria-label={`色 ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  className="labels__remove"
                  onClick={() => {
                    if (confirm(`ラベル「${l.name}」を削除? (タスクからも外れます)`)) {
                      removeLabel(l.id)
                    }
                  }}
                >
                  削除
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
