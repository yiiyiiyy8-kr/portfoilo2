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
      const fadeRange = height - window.innerHeight
      if (fadeRange <= 0) return

      const scrolled = Math.min(Math.max(-top, 0), fadeRange)
      setProgress(scrolled / fadeRange)
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
            transform: `scale(${1 - progress * 0.04}) translateY(${progress * -24}px)`,
            filter: `blur(${progress * 6}px)`,
            pointerEvents: progress > 0.85 ? 'none' : 'auto',
          }}
        >
          <Intro />
        </div>
      </div>
    </div>
  )
}

export default IntroReveal
