import introImg from '../assets/intro-ivbag.png'
import './Intro.css'

function Intro() {
  return (
    <section className="intro">
      <div className="intro__text">
        <h1 className="intro__heading">
          일상의 작은 불편함에,
          <br />
          더 나은 경험을 처방합니다.
        </h1>
        <p className="intro__subheading">사용자의 마음을 살피는 UX/UI 디자이너</p>
      </div>

      <div className="intro__image">
        <img src={introImg} alt="jae young cho, UX/UI 디자이너 소개 이미지" />
      </div>

      <div className="intro__scroll">
        <span className="intro__scroll-label">Scroll</span>
        <div className="intro__scroll-indicator">
          <span className="intro__scroll-dot" />
        </div>
      </div>
    </section>
  )
}

export default Intro
