import { useEffect, useRef } from 'react'
import bagSulshasoo from '../assets/desktop9/bag-sulshasoo.png'
import bagZipmate from '../assets/desktop9/bag-zipmate.png'
import sulshasooQr from '../assets/projects/sulshasoo-qr.png'
import zipmateQr from '../assets/projects/zipmate-qr.png'
import phoneMockup from '../assets/projects/sulshasoo-mockup.png'
import toolFigma from '../assets/projects/tools/figma.png'
import toolFramer from '../assets/projects/tools/framer.png'
import toolReact from '../assets/projects/tools/react.png'
import toolTypescript from '../assets/projects/tools/typescript.png'
import toolVite from '../assets/projects/tools/vite.png'
import toolVercel from '../assets/projects/tools/vercel.png'
import toolVscode from '../assets/projects/tools/vscode.png'
import toolClaude from '../assets/projects/tools/claude.png'
import toolGithub from '../assets/projects/tools/github.png'
import Aurora from './Aurora'
import './Work.css'

const tools = [
  { label: 'Design', icons: [toolFigma, toolFramer] },
  { label: 'Development', icons: [toolReact, toolTypescript, toolVite, toolVercel] },
  { label: 'Ai', icons: [toolVscode, toolClaude] },
  { label: 'Collaboration', icons: [toolGithub] },
]

export const projects = [
  {
    id: 'sulshasoo',
    name: 'Sulshasoo',
    image: bagSulshasoo,
    heading: ['시간이 쌓아온 아름다움을,', '오늘의 화면으로 잇습니다.'],
    sub: '설화수 웹사이트 리디자인 · 팀 프로젝트 · 기획, 디자인 100%',
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
      image: phoneMockup,
      layout: {
        textTop: 194,
        textGap: 59,
        textWidth: 638,
        descSize: 14,
        descSpacing: 0.7,
        footerLeft: 108,
        imageLeft: 918,
      },
      footer: { duration: '5.22 - 8.11', tools },
      link: 'https://harperppppppp.github.io/sulwhasoo/',
      qr: sulshasooQr,
    },
  },
  {
    id: 'zipmate',
    name: 'Zipmate',
    image: bagZipmate,
    heading: ['취향을 발견하는 순간부터,', '공간을 완성하는 순간까지.'],
    sub: '셀프 인테리어 앱 기획 및 디자인 · 팀 프로젝트 · 기획, 디자인 100%',
    detail: {
      eyebrow: 'Project 2',
      name: 'Zipmate',
      subtitle: '셀프 인테리어 브랜드 기획 및 디자인',
      meta: ['팀 프로젝트', '기획, 디자인 100%'],
      description: [
        '나다운 공간을 만들고 싶어도,',
        '어디서부터 시작해야 할지 막막할 때가 있습니다.',
        '집메이트는 취향을 발견하는 순간부터공간을 하나씩 완성해 가는 과정까지 함께합니다.',
        '셀프 인테리어가 조금 더 쉽고 즐거운 경험이 되도록사용자의 눈높이에서 앱을 기획하고 디자인했습니다.',
      ],
      image: phoneMockup,
      footer: { duration: '8.24 - 9.21', tools },
      link: 'https://zipmate-blond.vercel.app/',
      qr: zipmateQr,
      layout: {
        textTop: 183,
        textGap: 75,
        textWidth: 793,
        descSize: 16,
        descSpacing: 0.8,
        footerLeft: 95,
        imageLeft: 955,
      },
    },
  },
]

// A hanging bag modelled as a damped pendulum around its hook. Moving the
// pointer across it pushes it in that direction; a spring pulls it back, so it
// swings and settles on its own instead of replaying a canned animation.
function SwingingBag({ project, onSelect }) {
  const btnRef = useRef(null)
  const imgRef = useRef(null)
  const state = useRef({ angle: 0, vel: 0, squish: 0, squishVel: 0, raf: 0, lastX: null })

  useEffect(() => {
    const st = state.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let last = 0

    const step = (t) => {
      const dt = Math.min((t - (last || t)) / 1000, 0.032)
      last = t
      // torsion spring + damping (pendulum)
      st.vel += (-38 * st.angle - 3.2 * st.vel) * dt
      st.vel = Math.max(-90, Math.min(90, st.vel))
      st.angle += st.vel * dt
      // vertical squish spring
      st.squishVel += (-90 * st.squish - 7 * st.squishVel) * dt
      st.squish += st.squishVel * dt

      const img = imgRef.current
      if (img) {
        img.style.transform = `rotate(${st.angle}deg) scale(${1 - st.squish * 0.5}, ${1 + st.squish})`
      }

      const resting =
        Math.abs(st.angle) < 0.02 && Math.abs(st.vel) < 0.05 &&
        Math.abs(st.squish) < 0.001 && Math.abs(st.squishVel) < 0.01
      if (resting) {
        if (img) img.style.transform = ''
        st.raf = 0
        last = 0
      } else {
        st.raf = requestAnimationFrame(step)
      }
    }

    const wake = () => {
      if (!st.raf) st.raf = requestAnimationFrame(step)
    }

    const onEnter = (e) => {
      if (reduce) return
      st.lastX = e.clientX
      st.squishVel += 0.6
      st.vel += (Math.random() < 0.5 ? -1 : 1) * 14
      wake()
    }
    const onMove = (e) => {
      if (reduce) return
      if (st.lastX !== null) {
        const dx = e.clientX - st.lastX
        st.vel += Math.max(-40, Math.min(40, dx * 0.9))
        wake()
      }
      st.lastX = e.clientX
    }
    const onDown = () => {
      if (reduce) return
      st.squishVel -= 0.9
      wake()
    }
    const onLeave = () => {
      st.lastX = null
    }

    const btn = btnRef.current
    btn.addEventListener('pointerenter', onEnter)
    btn.addEventListener('pointermove', onMove)
    btn.addEventListener('pointerdown', onDown)
    btn.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(st.raf)
      btn.removeEventListener('pointerenter', onEnter)
      btn.removeEventListener('pointermove', onMove)
      btn.removeEventListener('pointerdown', onDown)
      btn.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <button
      ref={btnRef}
      type="button"
      className="work__bag"
      onClick={() => onSelect(project.detail)}
      aria-label={`${project.name} 프로젝트 상세 보기`}
    >
      <img ref={imgRef} src={project.image} alt={`${project.name} 프로젝트 썸네일`} />
    </button>
  )
}

// The screen revealed after the Intro: the two project bags side by side.
function Work({ onSelectProject }) {
  return (
    <div className="work">
      <Aurora className="work__aurora" />
      <p className="work__brand">Project</p>
      {projects.map((project) => (
        <SwingingBag key={project.id} project={project} onSelect={onSelectProject} />
      ))}
    </div>
  )
}

export default Work
