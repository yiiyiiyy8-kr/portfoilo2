import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS, scrollToSection } from '../sections'
import './SectionMenu.css'

// One small menu shared by every section. Pressing the heading in the top-left corner
// (Portfolio / Project / Tools / About Me) opens it right under that heading; picking a
// section scrolls there. It closes on Esc, a click elsewhere, or when the page is scrolled away.
const EXIT_MS = 240
const HOVER_GRACE = 260 // how long the menu waits before closing once the pointer has left it and the heading

function SectionMenu() {
  const [state, setState] = useState({ open: false, current: 'intro' })
  const [shown, setShown] = useState(false) // drives the enter / exit transition
  const ref = useRef(null)
  const openedAt = useRef(0)
  const exitTimer = useRef(0)

  const openRef = useRef(false)
  const pinned = useRef(false) // opened by a press: stays until dismissed, even when the pointer leaves
  const graceTimer = useRef(0)
  const shownRef = useRef(false)
  shownRef.current = shown

  const close = useCallback(() => {
    setShown(false)
    window.clearTimeout(exitTimer.current)
    exitTimer.current = window.setTimeout(() => {
      openRef.current = false
      pinned.current = false
      setState((s) => ({ ...s, open: false }))
    }, EXIT_MS)
  }, [])

  const openFor = useCallback((current) => {
    window.clearTimeout(exitTimer.current)
    window.clearTimeout(graceTimer.current)
    if (!openRef.current) {
      openedAt.current = window.scrollY
      openRef.current = true
      setState({ open: true, current })
      window.setTimeout(() => setShown(true), 20) // lets the enter transition start from "hidden"
    } else {
      setState((s) => (s.current === current ? s : { ...s, current }))
      setShown(true)
    }
  }, [])

  // pointer resting on a heading (or the menu) opens it; leaving both closes it after a short grace
  useEffect(() => {
    const scheduleClose = () => {
      window.clearTimeout(graceTimer.current)
      if (pinned.current) return
      graceTimer.current = window.setTimeout(() => {
        if (!pinned.current) close()
      }, HOVER_GRACE)
    }
    const onOver = (e) => {
      if (e.pointerType !== 'mouse') return
      const trigger = e.target.closest?.('.sm-trigger')
      if (trigger?.dataset.section) {
        openFor(trigger.dataset.section)
      } else if (ref.current?.contains(e.target)) {
        window.clearTimeout(graceTimer.current)
      }
    }
    const onOut = (e) => {
      if (e.pointerType !== 'mouse' || !openRef.current) return
      const from = e.target.closest?.('.sm-trigger') || (ref.current?.contains(e.target) ? ref.current : null)
      if (!from) return
      const to = e.relatedTarget
      const stillInside = to && (to.closest?.('.sm-trigger') || ref.current?.contains(to))
      if (!stillInside) scheduleClose()
    }
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      window.clearTimeout(graceTimer.current)
    }
  }, [close, openFor])

  // a corner heading asks to open / close the menu
  useEffect(() => {
    const onToggle = (e) => {
      if (openRef.current && shownRef.current) {
        if (pinned.current) {
          pinned.current = false
          close()
        } else {
          pinned.current = true // opened by hover: a press keeps it open
        }
        return
      }
      pinned.current = true
      openFor(e.detail.current)
    }
    window.addEventListener('section-menu', onToggle)
    return () => window.removeEventListener('section-menu', onToggle)
  }, [close, openFor])

  useEffect(() => {
    if (!state.open) return undefined
    const onDown = (e) => {
      if (ref.current?.contains(e.target)) return
      if (e.target.closest?.('.sm-trigger')) return // that press toggles on its own
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = () => {
      if (Math.abs(window.scrollY - openedAt.current) > 90) close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', close)
    }
  }, [state.open, close])

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  if (!state.open) return null

  const go = (key) => {
    close()
    if (key !== state.current) scrollToSection(key)
  }

  return (
    <nav className={`sm${shown ? ' is-in' : ''}`} ref={ref} aria-label="섹션 이동">
      <ul className="sm__card">
        {SECTIONS.map((s, i) => {
          const isCurrent = s.key === state.current
          return (
            <li key={s.key} className="sm__row" style={{ '--i': i }}>
              <button
                type="button"
                className={`sm__item${isCurrent ? ' is-current' : ''}`}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => go(s.key)}
              >
                <span className="sm__dot" aria-hidden="true" />
                {s.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default SectionMenu
