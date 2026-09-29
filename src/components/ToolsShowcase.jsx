import { useRef, useState } from 'react'
import toolBg from '../assets/desktop9/tool-bg.png'
import lineImg from '../assets/desktop9/line-104.svg'
import closeIcon from '../assets/desktop9/x-icon.svg'
import cursorLens from '../assets/desktop9/cursor-lens.svg'
import './ToolsShowcase.css'

const figmaSkillsNote =
  'Figma에서 오토 레이아웃, 컴포넌트, 프로토타이핑을 익혔습니다. 이를 활용해 와이어프레임부터 최종 UI까지 제작하고, 화면 간 사용 흐름을 직접 확인할 수 있습니다.'

const panels = [
  {
    title: 'DESIGN',
    tools: [
      { name: 'Figma', description: figmaSkillsNote },
      { name: 'Photoshop', description: figmaSkillsNote },
      { name: 'Illustrator', description: figmaSkillsNote },
    ],
  },
  {
    title: 'MOTION',
    tools: [
      { name: 'After Effects', description: '인터랙션과 화면 전환 등 모션 프로토타입을 만들 때 사용합니다.' },
      { name: 'Premiere Pro', description: '프로젝트 소개 및 시연 영상을 편집할 때 사용합니다.' },
    ],
  },
  {
    title: 'AI',
    tools: [
      { name: 'Midjourney', description: '무드보드와 컨셉 이미지를 빠르게 시각화할 때 사용합니다.' },
      { name: 'Claude', description: '리서치 정리와 코드 구현을 함께하는 AI 파트너입니다.' },
    ],
  },
]

function ToolPanel({ title, tools }) {
  const listRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)
  const [activeIndex, setActiveIndex] = useState(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    const rect = listRef.current.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleToolClick = (i) => {
    setActiveIndex((current) => (current === i ? null : i))
  }

  return (
    <div className="tool-panel">
      <div className="tool-panel__bg" aria-hidden="true">
        <img src={toolBg} alt="" className="tool-panel__bg-img tool-panel__bg-img--left" />
        <img src={toolBg} alt="" className="tool-panel__bg-img tool-panel__bg-img--right" />
      </div>

      <div className="tool-panel__overlay">
        <div className="tool-panel__header">
          <span className="tool-panel__label">Tools</span>
          <img src={closeIcon} alt="" className="tool-panel__close" />
        </div>
        <img src={lineImg} alt="" className="tool-panel__line tool-panel__line--top" />

        <div className="tool-panel__body">
          <h3 className="tool-panel__title">{title}</h3>
          <ul
            className="tool-panel__list"
            ref={listRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {tools.map((tool, i) => (
              <li
                key={tool.name}
                className={`tool-panel__item${hoverIndex === i ? ' is-hovered' : ''}`}
                onMouseEnter={() => setHoverIndex(i)}
                onClick={() => handleToolClick(i)}
              >
                <span className="tool-panel__item-name">{tool.name}</span>

                {activeIndex === i && (
                  <p className="tool-panel__description">{tool.description}</p>
                )}
              </li>
            ))}

            {hoverIndex !== null && (
              <span
                className="tool-panel__cursor"
                style={{
                  transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0) translate(-50%, -50%)`,
                  backgroundImage: `url(${cursorLens})`,
                }}
                aria-hidden="true"
              />
            )}
          </ul>
        </div>

        <img src={lineImg} alt="" className="tool-panel__line tool-panel__line--bottom" />
        <div className="tool-panel__footer">
          <span>2026</span>
          <span>@jaeyoung</span>
        </div>
      </div>
    </div>
  )
}

function ToolsShowcase() {
  return (
    <section className="tools" aria-label="사용 도구">
      {/* Lens-distortion filter used by the glass cursor to refract the tool labels beneath it. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="glass-refraction">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="tools__track">
        {panels.map((panel) => (
          <ToolPanel key={panel.title} {...panel} />
        ))}
      </div>
    </section>
  )
}

export default ToolsShowcase
