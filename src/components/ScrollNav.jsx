import { useEffect, useRef } from 'react'
import './ScrollNav.css'

// The cue normally says "scroll down" (upright pill, chevrons pointing down). While the
// Tools strip fills the window it turns on its side (pill lying down, chevrons pointing
// right) to say "this one goes sideways"; leaving Tools turns it back.
function ScrollNav() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const update = () => {
      const vh = window.innerHeight

      // step aside when the footer's big name is on screen so it doesn't sit on top of the letters
      const footer = document.querySelector('.site-footer')
      if (footer) {
        el.classList.toggle('is-hidden', footer.getBoundingClientRect().top < vh * 0.6)
      }

      // sideways mode while the Tools section covers the middle of the window
      const tools = document.querySelector('.tools')
      if (tools) {
        const r = tools.getBoundingClientRect()
        const inTools = r.top < vh * 0.5 && r.bottom > vh * 0.5
        const mode = inTools ? 'horizontal' : 'vertical'
        if (el.dataset.mode !== mode) el.dataset.mode = mode
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="scroll-nav" ref={ref} data-mode="vertical">
      <span className="scroll-nav-label">Scroll</span>
      <div className="scroll-nav-body">
        <div className="scroll-nav-indicator">
          <span className="scroll-nav-dot" />
        </div>
        <span className="scroll-nav-chevrons" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}

export default ScrollNav
