import type { Label, SortKey } from '../types'
import type { FilterState } from '../lib/filterSort'

type Props = {
  value: FilterState
  onChange: (next: FilterState) => void
  labels: Label[]
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'manual', label: '手動' },
  { key: 'createdAt', label: '日付' },
  { key: 'progress', label: '進捗' },
  { key: 'label', label: 'ラベル' },
  { key: 'title', label: '50音' },
]

export function TaskFilterBar({ value, onChange, labels }: Props) {
  const toggleLabel = (id: string) => {
    const has = value.labelIds.includes(id)
    onChange({
      ...value,
      labelIds: has
        ? value.labelIds.filter((x) => x !== id)
        : [...value.labelIds, id],
    })
  }

  return (
    <div className="filterbar">
      <input
        className="filterbar__search"
        placeholder="検索 (タイトル / 概要)"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
      />
      <div className="filterbar__sort">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.key}
            className={value.sort === o.key ? 'is-active' : ''}
            onClick={() => onChange({ ...value, sort: o.key })}
          >
            {o.label}
          </button>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="filterbar__labels">
          {labels.map((l) => {
            const active = value.labelIds.includes(l.id)
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
          {value.labelIds.length > 0 && (
            <button
              className="chip chip--clear"
              onClick={() => onChange({ ...value, labelIds: [] })}
            >
              クリア
            </button>
          )}
        </div>
      )}
    </div>
  )
}
