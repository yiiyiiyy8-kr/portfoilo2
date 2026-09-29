import arrowUp from '../assets/desktop9/arrow-up.svg'
import './ScrollCue.css'

function ScrollCue() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="scroll-cue">
      <button
        type="button"
        className="scroll-cue__button"
        onClick={scrollToTop}
        aria-label="맨 위로 스크롤"
      >
        <img src={arrowUp} alt="" />
      </button>
    </div>
  )
}

export default ScrollCue
