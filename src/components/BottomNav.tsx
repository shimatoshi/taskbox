import type { Tab } from '../types'

type Props = {
  tab: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'create', label: '作成', icon: '＋' },
  { key: 'boxes', label: 'ボックス', icon: '▦' },
  { key: 'all', label: '全タスク', icon: '☰' },
]

export function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="bottomnav">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          className={tab === it.key ? 'is-active' : ''}
          onClick={() => onChange(it.key)}
        >
          <span className="bottomnav__icon">{it.icon}</span>
          <span className="bottomnav__label">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
