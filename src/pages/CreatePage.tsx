import { useEffect, useMemo, useState } from 'react'
import type { Store } from '../hooks/useStore'
import { InlineCreate } from '../components/InlineCreate'
import type { Progress, Task } from '../types'

type Props = {
  store: Store
  onOpenLabels: () => void
  onEditTask: (task: Task) => void
}

export function CreatePage({ store, onOpenLabels, onEditTask }: Props) {
  const { boxes, labels, addBox, addLabel, addTask, ensureBoxLoaded, getCachedBox } = store
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [boxId, setBoxId] = useState<string>('')
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [progress, setProgress] = useState<Progress>(0)
  const [deadline, setDeadline] = useState('')
  const [previewLoaded, setPreviewLoaded] = useState(false)

  useEffect(() => {
    if (!boxId && boxes.length > 0) setBoxId(boxes[0].id)
  }, [boxes, boxId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.all(boxes.map((b) => ensureBoxLoaded(b.id)))
      if (!cancelled) setPreviewLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [boxes, ensureBoxLoaded])

  const allTasks = useMemo<Task[]>(() => {
    if (!previewLoaded) return []
    const out: Task[] = []
    for (const b of boxes) {
      const cached = getCachedBox(b.id) ?? []
      for (const t of cached) out.push(t)
    }
    return out
  }, [previewLoaded, boxes, getCachedBox])

  const recent = useMemo(
    () => [...allTasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [allTasks],
  )
  const upcoming = useMemo(
    () =>
      allTasks
        .filter((t) => t.deadline)
        .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
        .slice(0, 3),
    [allTasks],
  )

  const boxById = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes])

  const toggleLabel = (id: string) =>
    setLabelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const submit = async () => {
    if (!title.trim() || !boxId) return
    await addTask({
      title: title.trim(),
      description: description.trim(),
      boxId,
      labelIds,
      progress,
      deadline: deadline || undefined,
    })
    setTitle('')
    setDescription('')
    setLabelIds([])
    setProgress(0)
    setDeadline('')
  }

  return (
    <div className="page">
      <div className="draftcard">
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
          <label>ボックス</label>
          {boxes.length === 0 ? (
            <span className="draftcard__hint">下の「ボックス作成」から作ってください</span>
          ) : (
            <div className="chiprow">
              {boxes.map((b) => (
                <button
                  key={b.id}
                  className={`chip ${boxId === b.id ? 'is-active' : ''}`}
                  style={
                    boxId === b.id
                      ? { background: b.color, borderColor: b.color, color: '#0b1220' }
                      : { borderColor: b.color, color: b.color }
                  }
                  onClick={() => setBoxId(b.id)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="draftcard__field">
          <div className="draftcard__fieldhead">
            <label>ラベル（複数可）</label>
            {labels.length > 0 && (
              <button className="draftcard__manage" onClick={onOpenLabels}>
                管理
              </button>
            )}
          </div>
          {labels.length === 0 ? (
            <span className="draftcard__hint">下の「ラベル作成」から作ってください</span>
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

        <div className="draftcard__field draftcard__row">
          <div>
            <label>期限</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label>進捗</label>
            <select
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value) as Progress)}
            >
              <option value={0}>0 (未着手)</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <button
            className="draftcard__submit"
            onClick={submit}
            disabled={!title.trim() || !boxId}
          >
            投げる
          </button>
        </div>
      </div>

      {previewLoaded && allTasks.length > 0 && (
        <div className="previews">
          <PreviewSection
            heading="最近追加"
            tasks={recent}
            boxById={boxById}
            onEditTask={onEditTask}
            emptyText="まだありません"
          />
          <PreviewSection
            heading="期限が近い"
            tasks={upcoming}
            boxById={boxById}
            onEditTask={onEditTask}
            emptyText="期限ありのタスクなし"
          />
        </div>
      )}

      <div className="page__bottom">
        <InlineCreate
          placeholder="ラベル名"
          buttonLabel="ラベル作成"
          onCreate={(n) => addLabel(n)}
        />
        <InlineCreate
          placeholder="ボックス名"
          buttonLabel="ボックス作成"
          onCreate={(n) => addBox(n)}
        />
      </div>
    </div>
  )
}

type PreviewSectionProps = {
  heading: string
  tasks: Task[]
  boxById: Map<string, { id: string; name: string; color: string }>
  onEditTask: (task: Task) => void
  emptyText: string
}

function PreviewSection({
  heading,
  tasks,
  boxById,
  onEditTask,
  emptyText,
}: PreviewSectionProps) {
  return (
    <section className="preview">
      <h3 className="preview__head">{heading}</h3>
      {tasks.length === 0 ? (
        <p className="preview__empty">{emptyText}</p>
      ) : (
        <ul className="preview__list">
          {tasks.map((t) => {
            const box = boxById.get(t.boxId)
            return (
              <li key={t.id}>
                <button className="preview__row" onClick={() => onEditTask(t)}>
                  {box && (
                    <span
                      className="preview__boxdot"
                      style={{ background: box.color }}
                    />
                  )}
                  <span className="preview__title">{t.title}</span>
                  {t.deadline && <span className="preview__date">{t.deadline}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
