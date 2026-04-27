import { useCallback, useRef } from 'react'

type Opts = {
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function useDragReorder({ onReorder }: Opts) {
  const containerRef = useRef<HTMLDivElement>(null)
  const state = useRef<{
    dragging: boolean
    el: HTMLElement | null
    startY: number
    index: number
    currentIndex: number
    rects: DOMRect[]
    placeholder: HTMLElement | null
  }>({
    dragging: false,
    el: null,
    startY: 0,
    index: -1,
    currentIndex: -1,
    rects: [],
    placeholder: null,
  })

  const getItems = (): HTMLElement[] => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-drag-idx]'))
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const handle = (e.target as HTMLElement).closest('[data-drag-handle]') as HTMLElement | null
    if (!handle) return
    const card = handle.closest('[data-drag-idx]') as HTMLElement | null
    if (!card || !containerRef.current) return

    e.preventDefault()
    const idx = Number(card.dataset.dragIdx)
    const items = getItems()
    const rects = items.map((el) => el.getBoundingClientRect())

    // Create placeholder
    const rect = rects[idx]
    const placeholder = document.createElement('div')
    placeholder.className = 'drag-placeholder'
    placeholder.style.height = rect.height + 'px'
    card.parentElement!.insertBefore(placeholder, card)

    // Set dragged card to fixed position
    card.classList.add('is-dragging')
    card.style.position = 'fixed'
    card.style.width = rect.width + 'px'
    card.style.top = rect.top + 'px'
    card.style.left = rect.left + 'px'
    card.style.zIndex = '200'

    state.current = {
      dragging: true,
      el: card,
      startY: e.clientY,
      index: idx,
      currentIndex: idx,
      rects,
      placeholder,
    }

    card.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = state.current
    if (!s.dragging || !s.el) return
    e.preventDefault()

    const dy = e.clientY - s.startY
    s.el.style.top = (s.rects[s.index].top + dy) + 'px'

    // Find which slot we're hovering over
    const centerY = s.rects[s.index].top + dy + s.rects[s.index].height / 2
    let newIdx = s.index
    for (let i = 0; i < s.rects.length; i++) {
      const r = s.rects[i]
      const mid = r.top + r.height / 2
      if (i < s.index && centerY < mid) {
        newIdx = i
        break
      }
      if (i > s.index && centerY > mid) {
        newIdx = i
      }
    }

    if (newIdx !== s.currentIndex && s.placeholder && containerRef.current) {
      const items = getItems()
      const parent = containerRef.current
      if (newIdx >= items.length) {
        parent.appendChild(s.placeholder)
      } else {
        const target = items[newIdx]
        if (newIdx > s.currentIndex) {
          target.after(s.placeholder)
        } else {
          parent.insertBefore(s.placeholder, target)
        }
      }
      s.currentIndex = newIdx
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = state.current
    if (!s.dragging || !s.el) return
    e.preventDefault()

    s.el.classList.remove('is-dragging')
    s.el.style.position = ''
    s.el.style.width = ''
    s.el.style.top = ''
    s.el.style.left = ''
    s.el.style.zIndex = ''

    s.placeholder?.remove()

    const from = s.index
    const to = s.currentIndex
    s.dragging = false
    s.el = null

    if (from !== to) {
      onReorder(from, to)
    }
  }, [onReorder])

  return {
    containerRef,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  }
}
