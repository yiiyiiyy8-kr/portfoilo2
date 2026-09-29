import { useEffect } from 'react'
import closeIcon from '../assets/desktop9/x-icon.svg'
import './ProjectDetail.css'

function ProjectDetail({ project, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!project) return null

  return (
    <div className="project-detail" role="dialog" aria-modal="true" aria-label={project.name}>
      <div className="project-detail__header">
        <span className="project-detail__eyebrow">{project.eyebrow}</span>
        <button
          type="button"
          className="project-detail__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <img src={closeIcon} alt="" />
        </button>
      </div>

      <div className="project-detail__body">
        <div className="project-detail__text">
          <h2 className="project-detail__title">[{project.name}]</h2>
          <h3 className="project-detail__subtitle">{project.subtitle}</h3>
          <p className="project-detail__meta">
            {project.meta.join('  |  ')}
          </p>
          <div className="project-detail__description">
            {project.description.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="project-detail__image">
          <img src={project.image} alt={`${project.name} 프로젝트 이미지`} />
        </div>
      </div>

      <div className="project-detail__footer">
        <span>Project Duration</span>
        <span>Tools</span>
        <span>Scope of Work</span>
      </div>
    </div>
  )
}

export default ProjectDetail
