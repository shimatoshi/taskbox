type Props = {
  title: string
  completedCount: number | null
  onOpenCompleted: () => void
}

export function HeaderBar({ title, completedCount, onOpenCompleted }: Props) {
  return (
    <header className="header">
      <h1 className="header__title">{title}</h1>
      <button
        className="header__check"
        onClick={onOpenCompleted}
        aria-label="完了済みを見る"
        title="完了済み"
      >
        ✓
        {completedCount !== null && completedCount > 0 && (
          <span className="header__check-badge">{completedCount}</span>
        )}
      </button>
    </header>
  )
}
