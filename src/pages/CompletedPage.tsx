import { useEffect } from 'react'
import type { Store } from '../hooks/useStore'

type Props = {
  store: Store
  onBack: () => void
}

export function CompletedPage({ store, onBack }: Props) {
  const { boxes, labels, completed, ensureCompletedLoaded, restoreFromCompleted, purgeCompleted } =
    store

  useEffect(() => {
    if (completed === null) ensureCompletedLoaded()
  }, [completed, ensureCompletedLoaded])

  const boxById = new Map(boxes.map((b) => [b.id, b]))

  return (
    <div className="page completed">
      <header className="completed__head">
        <button className="completed__back" onClick={onBack}>
          ← 戻る
        </button>
        <h2>完了したタスク</h2>
      </header>
      {completed === null ? (
        <p className="empty">読み込み中…</p>
      ) : completed.length === 0 ? (
        <p className="empty">まだ何も完了してません</p>
      ) : (
        <ul className="completed__list">
          {completed.map((t) => {
            const box = boxById.get(t.boxId)
            const taskLabels = labels.filter((l) => t.labelIds.includes(l.id))
            return (
              <li key={t.id} className="completed__item">
                <div className="completed__main">
                  <strong className="completed__title">{t.title}</strong>
                  {box && (
                    <span className="card__boxtag" style={{ background: box.color }}>
                      {box.name}
                    </span>
                  )}
                  {taskLabels.map((l) => (
                    <span
                      key={l.id}
                      className="card__label"
                      style={{ color: l.color, borderColor: l.color }}
                    >
                      #{l.name}
                    </span>
                  ))}
                  {t.completedAt && (
                    <span className="completed__when">
                      {new Date(t.completedAt).toLocaleString('ja')}
                    </span>
                  )}
                </div>
                <div className="completed__actions">
                  <button onClick={() => restoreFromCompleted(t.id)}>戻す</button>
                  <button
                    className="completed__purge"
                    onClick={() => {
                      if (confirm('完全に削除しますか?')) purgeCompleted(t.id)
                    }}
                  >
                    削除
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
