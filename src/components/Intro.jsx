import { Fragment } from 'react'
import introImg from '../assets/intro-ivbag.png'
import RippleImage from './RippleImage'
import './Intro.css'

const LINES = ['일상의 작은 불편함에,', '더 나은 경험을 처방합니다.']
const SUB = '사용자의 마음을 살피는 UX/UI 디자이너'

function Intro() {
  return (
    <section className="intro">
      <p className="intro__brand">Portfolio</p>

      <div className="intro__text">
        <h1 className="intro__heading">
          {LINES.map((line, i) => (
            <span className="intro__line" key={line}>
              <span className="intro__line-inner" style={{ '--d': `${i * 0.18}s` }}>
                {line}
              </span>
            </span>
          ))}
        </h1>
        <p className="intro__subheading" aria-label={SUB}>
          {SUB.split(' ').map((word, w, words) => {
            const offset = words.slice(0, w).join(' ').length + (w ? 1 : 0)
            return (
              <Fragment key={w}>
                <span className="intro__word" aria-hidden="true">
                  {[...word].map((ch, i) => (
                    <span
                      className="intro__char"
                      key={i}
                      style={{ '--i': offset + i }}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
                {w < words.length - 1 ? ' ' : null}
              </Fragment>
            )
          })}
        </p>
      </div>

      <div className="intro__image">
        <RippleImage
          src={introImg}
          alt="jae young cho, UX/UI 디자이너 소개 이미지"
        />
      </div>
    </section>
  )
}

export default Intro
