import { useEffect, useMemo, useState } from 'react'
import { isDescendantOf } from '../lib/tree'
import type { Box, Label, Task } from '../types'

type Props = {
  task: Task
  boxes: Box[]
  labels: Label[]
  candidateParents: Task[]
  onSave: (next: {
    title: string
    description: string
    boxId: string
    parentId?: string
    labelIds: string[]
    deadline?: string
  }) => Promise<void> | void
  onClose: () => void
}

export function TaskEditModal({
  task,
  boxes,
  labels,
  candidateParents,
  onSave,
  onClose,
}: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [boxId, setBoxId] = useState(task.boxId)
  const [parentId, setParentId] = useState<string | undefined>(task.parentId)
  const [labelIds, setLabelIds] = useState<string[]>(task.labelIds)
  const [deadline, setDeadline] = useState(task.deadline ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const validParents = useMemo(
    () =>
      candidateParents.filter(
        (c) => c.id !== task.id && !isDescendantOf(candidateParents, task.id, c.id),
      ),
    [candidateParents, task.id],
  )

  const parentTask = parentId ? candidateParents.find((c) => c.id === parentId) : undefined
  const effectiveBoxId = parentTask ? parentTask.boxId : boxId

  const toggleLabel = (id: string) =>
    setLabelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        boxId: effectiveBoxId,
        parentId,
        labelIds,
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
          <h3>タスクを編集</h3>
          <button className="modal__x" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="modal__body">
          <input
            className="draftcard__title"
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="draftcard__desc"
            placeholder="概要 / メモ"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="draftcard__field">
            <label>親タスク</label>
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value || undefined)}
            >
              <option value="">（なし）</option>
              {validParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {parentTask && (
              <span className="draftcard__hint">
                親と同じボックスに移動します
              </span>
            )}
          </div>

          <div className="draftcard__field">
            <label>ボックス {parentTask && '(親に追従)'}</label>
            <div className="chiprow">
              {boxes.map((b) => (
                <button
                  key={b.id}
                  className={`chip ${effectiveBoxId === b.id ? 'is-active' : ''}`}
                  style={
                    effectiveBoxId === b.id
                      ? { background: b.color, borderColor: b.color, color: '#0b1220' }
                      : { borderColor: b.color, color: b.color }
                  }
                  onClick={() => !parentTask && setBoxId(b.id)}
                  disabled={!!parentTask}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="draftcard__field">
            <label>ラベル（複数可）</label>
            {labels.length === 0 ? (
              <span className="draftcard__hint">ラベルがありません</span>
            ) : (
              <div className="chiprow">
                {labels.map((l) => {
                  const active = labelIds.includes(l.id)
                  return (
                    <button
                      key={l.id}
                      className={`chip ${active ? 'is-active' : ''}`}
                      style={
                        active
                          ? { background: l.color, borderColor: l.color, color: '#0b1220' }
                          : { borderColor: l.color, color: l.color }
                      }
                      onClick={() => toggleLabel(l.id)}
                    >
                      #{l.name}
                    </button>
                  )
                })}
              </div>
            )}
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
            disabled={!title.trim() || saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </footer>
      </div>
    </div>
  )
}
