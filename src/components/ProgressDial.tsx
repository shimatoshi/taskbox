import type { Progress } from '../types'

type Props = {
  value: Progress
  onChange: (next: Progress) => void
}

const VALUES: Progress[] = [0, 1, 2, 3, 4, 5]

const LABEL: Record<Progress, string> = {
  0: '未着手',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '完了',
}

export function ProgressDial({ value, onChange }: Props) {
  return (
    <div className="dial" role="radiogroup" aria-label="進捗">
      {VALUES.map((v) => {
        const active = v <= value
        return (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            className={`dial__cell ${active ? 'is-on' : ''} ${value === v ? 'is-current' : ''}`}
            onClick={() => onChange(v)}
            title={LABEL[v]}
          >
            {v === 0 ? '–' : v === 5 ? '✓' : v}
          </button>
        )
      })}
    </div>
  )
}
