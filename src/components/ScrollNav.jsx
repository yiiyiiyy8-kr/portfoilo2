import { useEffect, useRef } from 'react'
import './ScrollNav.css'

function ScrollNav() {
  const ref = useRef(null)

  // step aside when the footer's big name is on screen so it doesn't sit on top of the letters
  useEffect(() => {
    const el = ref.current
    const update = () => {
      const footer = document.querySelector('.site-footer')
      if (!footer) return
      const { top } = footer.getBoundingClientRect()
      el.classList.toggle('is-hidden', top < window.innerHeight * 0.6)
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
    <div className="scroll-nav" ref={ref}>
      <span className="scroll-nav-label">Scroll</span>
      <div className="scroll-nav-indicator">
        <span className="scroll-nav-dot" />
      </div>
      <span className="scroll-nav-chevrons" aria-hidden="true">
        <i />
        <i />
      </span>
    </div>
  )
}

export default ScrollNav
