type Props = {
  title: string
  completedCount: number | null
  onOpenCompleted: () => void
  onOpenSettings: () => void
}

export function HeaderBar({
  title,
  completedCount,
  onOpenCompleted,
  onOpenSettings,
}: Props) {
  return (
    <header className="header">
      <h1 className="header__title">{title}</h1>
      <div className="header__actions">
        <button
          className="header__icon"
          onClick={onOpenSettings}
          aria-label="データ"
          title="データ (バックアップ)"
        >
          💾
        </button>
        <button
          className="header__icon"
          onClick={onOpenCompleted}
          aria-label="完了済みを見る"
          title="完了済み"
        >
          ✓
          {completedCount !== null && completedCount > 0 && (
            <span className="header__icon-badge">{completedCount}</span>
          )}
        </button>
      </div>
    </header>
  )
}
