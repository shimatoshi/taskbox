import { useState } from 'react'

type Props = {
  placeholder: string
  buttonLabel: string
  onCreate: (name: string) => void
}

export function InlineCreate({ placeholder, buttonLabel, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const submit = () => {
    const v = value.trim()
    if (!v) return
    onCreate(v)
    setValue('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="inlinecreate__open" onClick={() => setOpen(true)}>
        + {buttonLabel}
      </button>
    )
  }

  return (
    <div className="inlinecreate">
      <input
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') {
            setOpen(false)
            setValue('')
          }
        }}
      />
      <button onClick={submit}>追加</button>
      <button
        className="inlinecreate__cancel"
        onClick={() => {
          setOpen(false)
          setValue('')
        }}
      >
        キャンセル
      </button>
    </div>
  )
}
