import { useEffect, useRef, useState } from 'react'
import Intro from './Intro'
import Work from './Work'
import './IntroReveal.css'

// Intro and Work are stacked in the SAME sticky viewport slot for the
// duration of this tall wrapper, so as Intro dissolves out, Work (the
// "Desktop9" layer) is already sitting right behind it rather than
// appearing only after Intro has fully scrolled away.
function IntroReveal({ onSelectProject }) {
  const wrapperRef = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let ticking = false

    const update = () => {
      ticking = false
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const { top, height } = wrapper.getBoundingClientRect()
      const range = height - window.innerHeight
      if (range <= 0) return

      // Intro dissolves out to reveal the project bags behind it
      const scrolled = Math.min(Math.max(-top, 0), range)
      setProgress(scrolled / range)
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="intro-reveal" ref={wrapperRef}>
      <div className="intro-reveal__stage">
        <div className="intro-reveal__layer intro-reveal__layer--work">
          <Work onSelectProject={onSelectProject} />
        </div>

        <div
          className="intro-reveal__layer intro-reveal__layer--intro"
          style={{
            opacity: 1 - progress,
            pointerEvents: progress > 0.5 ? 'none' : 'auto',
          }}
        >
          <Intro />
        </div>
      </div>
    </div>
  )
}

export default IntroReveal
