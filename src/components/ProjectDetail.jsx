import { useCallback, useEffect, useRef, useState } from 'react'
import closeIcon from '../assets/desktop9/x-icon.svg'
import './ProjectDetail.css'

// Fixed 1440 x 1024 Figma frame, centred and scaled as one unit to fit the
// window, so spacing between text, footer and phone never changes.
const FRAME_W = 1440
const FRAME_H = 1024
const CLOSE_MS = 420

const DEFAULT_FOOTER = { duration: null, tools: [] }

const fitScale = () =>
  Math.min(window.innerWidth / FRAME_W, window.innerHeight / FRAME_H)

function ProjectDetail({ project, onClose }) {
  const [scale, setScale] = useState(fitScale)
  const [closing, setClosing] = useState(false)
  const phoneRef = useRef(null)
  const closeTimer = useRef(0)

  // play the exit animation, then hand control back to the parent
  const requestClose = useCallback(() => {
    if (closeTimer.current) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    const handleResize = () => setScale(fitScale())
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
    }
  }, [requestClose])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // the phone leans gently toward the pointer
  const handlePointerMove = (e) => {
    const el = phoneRef.current
    if (!el) return
    const x = e.clientX / window.innerWidth - 0.5
    const y = e.clientY / window.innerHeight - 0.5
    el.style.setProperty('--ry', `${x * 14}deg`)
    el.style.setProperty('--rx', `${-y * 10}deg`)
  }

  if (!project) return null

  const footer = project.footer ?? DEFAULT_FOOTER
  const layout = project.layout
  const stageStyle = { '--scale': scale }
  if (layout) {
    stageStyle['--text-top'] = `${layout.textTop}px`
    stageStyle['--text-gap'] = `${layout.textGap}px`
    stageStyle['--text-w'] = `${layout.textWidth}px`
    stageStyle['--desc-size'] = `${layout.descSize}px`
    stageStyle['--desc-ls'] = `${layout.descSpacing}px`
    stageStyle['--footer-left'] = `${layout.footerLeft}px`
    stageStyle['--image-left'] = `${layout.imageLeft}px`
    if (layout.imageTop) stageStyle['--image-top'] = `${layout.imageTop}px`
    if (layout.imageWidth) stageStyle['--image-w'] = `${layout.imageWidth}px`
  }

  // each piece rises in after the last: `--d` is its delay in seconds
  const d = (n) => ({ '--d': `${n}s` })

  return (
    <div
      className={`project-detail${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={project.name}
      onPointerMove={handlePointerMove}
    >
      <div className="project-detail__stage" style={stageStyle}>
        <span className="project-detail__eyebrow pd-rise" style={d(0.3)}>
          {project.eyebrow}
        </span>

        <button
          type="button"
          className="project-detail__close pd-rise"
          style={d(0.35)}
          onClick={requestClose}
          aria-label="닫기"
        >
          <img src={closeIcon} alt="" />
        </button>

        <div className="project-detail__text">
          <div className="project-detail__head">
            <h2 className="project-detail__title pd-rise" style={d(0.4)}>
              [{project.name}]
            </h2>
            <h3 className="project-detail__subtitle pd-rise" style={d(0.5)}>
              {project.subtitle}
            </h3>
            <p className="project-detail__meta pd-rise" style={d(0.6)}>
              {project.meta.map((item, i) => (
                <span className="project-detail__meta-group" key={item}>
                  {i > 0 && <span className="project-detail__meta-sep">|</span>}
                  <span>{item}</span>
                </span>
              ))}
            </p>
          </div>
          <div className="project-detail__description">
            {project.description.map((line, i) => (
              <p key={line} className="pd-rise" style={d(0.72 + i * 0.07)}>
                {line}
              </p>
            ))}
            {project.links && (
              <ul
                className="project-detail__links pd-rise"
                style={d(0.72 + project.description.length * 0.07)}
              >
                {project.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`${l.tag} 열기`}>
                      <span className="project-detail__tag">{l.tag}</span>
                      <span className="project-detail__short">
                        {l.short}
                        <span aria-hidden="true"> ↗</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {!project.links && project.link && (
              <div
                className="project-detail__link-row pd-rise"
                style={d(0.72 + project.description.length * 0.07)}
              >
                {project.qr && (
                  <a
                    className="project-detail__qr"
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.name} 사이트 QR 코드`}
                  >
                    <img src={project.qr} alt="" />
                  </a>
                )}
                <a
                  className="project-detail__link"
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.link.replace(/^https?:\/\//, '')}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="project-detail__image pd-phone" style={d(0.45)}>
          <div className="project-detail__float">
            <img
              ref={phoneRef}
              src={project.image}
              alt={`${project.name} 프로젝트 이미지`}
            />
          </div>
        </div>

        <div className="project-detail__footer">
          <div className="project-detail__duration pd-rise" style={d(0.95)}>
            <span className="project-detail__col-title">Project Duration</span>
            {footer.duration && (
              <span className="project-detail__duration-value">{footer.duration}</span>
            )}
          </div>
          <div className="project-detail__tools pd-rise" style={d(1.02)}>
            <span className="project-detail__col-title">Tools</span>
            <div className="project-detail__tool-groups">
              {footer.tools.map((group) => (
                <div className="project-detail__tool-group" key={group.label}>
                  <span className="project-detail__tool-label">{group.label}</span>
                  <div className="project-detail__tool-icons">
                    {group.icons.map((src, i) => (
                      <img
                        src={src}
                        alt=""
                        key={i}
                        className="pd-pop"
                        style={d(1.15 + i * 0.05)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail
