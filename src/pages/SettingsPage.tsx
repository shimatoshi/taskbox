import { useRef, useState } from 'react'
import { exportAll, importAll, isBackup } from '../db'

type Props = {
  onBack: () => void
}

export function SettingsPage({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleExport = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.download = `taskbox-backup-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setMsg('エクスポート完了')
    } catch (e) {
      setMsg(`失敗: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const handleImportPick = () => fileRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const text = await file.text()
      const json: unknown = JSON.parse(text)
      if (!isBackup(json)) {
        throw new Error('バックアップ形式が不正です (version 1 が必要)')
      }
      const ok = confirm(
        `現在のデータを上書きします。よろしいですか?\n` +
          `(boxes: ${json.boxes.length}, labels: ${json.labels.length}, ` +
          `completed: ${json.completed.length})`,
      )
      if (!ok) {
        setMsg('キャンセルしました')
        return
      }
      await importAll(json)
      setMsg('インポート完了。リロードします…')
      setTimeout(() => location.reload(), 700)
    } catch (e) {
      setMsg(`失敗: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page settings">
      <header className="completed__head">
        <button className="completed__back" onClick={onBack}>
          ← 戻る
        </button>
        <h2>データ</h2>
      </header>

      <section className="settings__section">
        <h3>エクスポート</h3>
        <p className="settings__hint">
          全てのボックス・ラベル・タスク・完了履歴を JSON 1ファイルに書き出します。
        </p>
        <button className="settings__btn" onClick={handleExport} disabled={busy}>
          📤 JSON をダウンロード
        </button>
      </section>

      <section className="settings__section">
        <h3>インポート</h3>
        <p className="settings__hint">
          JSON ファイルを選択 → 確認後、現在のデータを上書きしてリロードします。
        </p>
        <button className="settings__btn" onClick={handleImportPick} disabled={busy}>
          📥 JSON を選択
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </section>

      {msg && <p className="settings__msg">{msg}</p>}
    </div>
  )
}
