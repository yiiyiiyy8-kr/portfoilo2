import { useEffect, useState } from 'react'
import closeIcon from '../assets/desktop9/x-icon.svg'
import './ProjectDetail.css'

// Fixed 1440 x 1024 Figma frame, centred and scaled as one unit to fit the
// window, so spacing between text, footer and phone never changes.
const FRAME_W = 1440
const FRAME_H = 1024

const DEFAULT_FOOTER = { duration: null, tools: [] }

const fitScale = () =>
  Math.min(window.innerWidth / FRAME_W, window.innerHeight / FRAME_H)

function ProjectDetail({ project, onClose }) {
  const [scale, setScale] = useState(fitScale)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
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
  }, [onClose])

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
  }

  return (
    <div className="project-detail" role="dialog" aria-modal="true" aria-label={project.name}>
      <div className="project-detail__stage" style={stageStyle}>
        <span className="project-detail__eyebrow">{project.eyebrow}</span>

        <button
          type="button"
          className="project-detail__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <img src={closeIcon} alt="" />
        </button>

        <div className="project-detail__text">
          <div className="project-detail__head">
            <h2 className="project-detail__title">[{project.name}]</h2>
            <h3 className="project-detail__subtitle">{project.subtitle}</h3>
            <p className="project-detail__meta">
              {project.meta.map((item, i) => (
                <span className="project-detail__meta-group" key={item}>
                  {i > 0 && <span className="project-detail__meta-sep">|</span>}
                  <span>{item}</span>
                </span>
              ))}
            </p>
          </div>
          <div className="project-detail__description">
            {project.description.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="project-detail__image">
          <img src={project.image} alt={`${project.name} 프로젝트 이미지`} />
        </div>

        <div className="project-detail__footer">
          <div className="project-detail__duration">
            <span className="project-detail__col-title">Project Duration</span>
            {footer.duration && (
              <span className="project-detail__duration-value">{footer.duration}</span>
            )}
          </div>
          <div className="project-detail__tools">
            <span className="project-detail__col-title">Tools</span>
            <div className="project-detail__tool-groups">
              {footer.tools.map((group) => (
                <div className="project-detail__tool-group" key={group.label}>
                  <span className="project-detail__tool-label">{group.label}</span>
                  <div className="project-detail__tool-icons">
                    {group.icons.map((src, i) => (
                      <img src={src} alt="" key={i} />
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
