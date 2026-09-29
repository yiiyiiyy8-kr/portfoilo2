import { useEffect, useRef, useState } from 'react'
import bagJaeyoung from '../assets/desktop9/bag-jaeyoungcho.png'
import bagSulshasoo from '../assets/desktop9/bag-sulshasoo.png'
import bagZipmate from '../assets/desktop9/bag-zipmate.png'
import sulshasooDetail from '../assets/projects/sulshasoo-detail.png'
import zipmateDetail from '../assets/projects/zipmate-detail.png'
import './Work.css'

export const projects = [
  { id: 'jaeyoungcho', name: 'jae young cho', image: bagJaeyoung },
  {
    id: 'sulshasoo',
    name: 'Sulshasoo',
    image: bagSulshasoo,
    detail: {
      eyebrow: 'Project 1',
      name: 'Sulshasoo',
      subtitle: '화장품 브랜드 기획 및 디자인',
      meta: ['팀 프로젝트', '기획, 디자인 100%'],
      description: [
        'Sulshasoo는 설화수는 시간이 쌓아온 아름다움에',
        '오늘의 감각을 더하는 브랜드입니다.',
        '전통과 현대가 공존하는 브랜드 경험을',
        '디지털 공간에서도 온전히 느낄 수 있도록 설화수 웹사이트를 리디자인했습니다.',
      ],
      image: sulshasooDetail,
    },
  },
  {
    id: 'zipmate',
    name: 'Zipmate',
    image: bagZipmate,
    detail: {
      eyebrow: 'Project 2',
      name: 'Zipmate',
      subtitle: '셀프 인테리어 브랜드 기획 및 디자인',
      meta: ['팀 프로젝트', '기획, 디자인 100%'],
      description: [
        '나다운 공간을 만들고 싶어도,',
        '어디서부터 시작해야 할지 막막할 때가 있습니다.',
        '집메이트는 취향을 발견하는 순간부터',
        '공간을 하나씩 완성해 가는 과정까지 함께합니다.',
        '셀프 인테리어가 조금 더 쉽고 즐거운 경험이 되도록',
        '사용자의 눈높이에서 앱을 기획하고 디자인했습니다.',
      ],
      image: zipmateDetail,
    },
  },
]

function Work({ onSelectProject }) {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className={`work${isVisible ? ' work--visible' : ''}`} ref={sectionRef}>
      <div className="work__text">
        <h2 className="work__heading">
          일상의 작은 불편함에,
          <br />
          더 나은 경험을 처방합니다.
        </h2>
        <p className="work__subheading">사용자의 마음을 살피는 UX/UI 디자이너</p>
      </div>

      <div className="work__track" aria-label="프로젝트 미리보기">
        {projects.map((project, i) => (
          <div
            className="work__card"
            key={project.id}
            style={{ '--delay': `${i * 0.15}s` }}
          >
            {project.detail ? (
              <button
                type="button"
                className="work__card-button"
                onClick={() => onSelectProject(project.detail)}
                aria-label={`${project.name} 프로젝트 상세 보기`}
              >
                <img src={project.image} alt={`${project.name} 프로젝트 썸네일`} />
              </button>
            ) : (
              <img src={project.image} alt={`${project.name} 프로젝트 썸네일`} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default Work
