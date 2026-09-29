import './ScrollNav.css'

function ScrollNav() {
  return (
    <div className="scroll-nav">
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
