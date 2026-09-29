import bgImg from '../assets/desktop9/aboutme-bg.png'
import './AboutMe.css'

function AboutMe() {
  return (
    <section className="aboutme">
      <img
        src={bgImg}
        alt=""
        className="aboutme__deco aboutme__deco--1"
        aria-hidden="true"
      />
      <img
        src={bgImg}
        alt=""
        className="aboutme__deco aboutme__deco--2"
        aria-hidden="true"
      />
      <img
        src={bgImg}
        alt=""
        className="aboutme__deco aboutme__deco--3"
        aria-hidden="true"
      />

      <div className="aboutme__content">
        <h2 className="aboutme__heading">About me</h2>
        <h3 className="aboutme__subheading">연극</h3>
        <div className="aboutme__text">
          <p>저는 4년 동안 연극을 하며 무대 위에서 다양한 인물과 이야기를 경험했습니다.</p>
          <p>
            하나의 인물을 표현하기 위해서는 대사를 외우는 것보다 먼저, 그 사람이 왜 이런
            말을 하고 어떤 감정을 느끼며 어떤 행동을 선택하는지 이해해야 했습니다. 같은
            상황에서도 사람마다 다르게 생각하고 행동할 수 있다는 것을 고민하며 자연스럽게
            사람을 관찰하고, 상대의 입장에서 생각하는 습관을 가지게 되었습니다.
          </p>
          <p>
            또한 연극은 혼자서 완성할 수 없는 작업이었습니다. 배우뿐만 아니라 연출, 무대,
            조명, 음향 등 서로 다른 역할을 가진 사람들이 하나의 공연을 만들기 위해
            끊임없이 의견을 나누고 조율해야 했습니다. 그 과정에서 제 생각을 표현하는
            것만큼 다른 사람의 의견을 듣고, 서로 다른 생각 사이에서 더 나은 방향을
            찾아가는 것이 중요하다는 것을 배웠습니다.
          </p>
          <p>
            무엇보다 무대에 서는 내가 무엇을 보여주고 싶은지보다 관객이 무엇을 보고,
            느끼고, 이해하는지가 중요했습니다. 같은 장면도 동선과 대사의 타이밍, 조명과
            무대 구성에 따라 관객에게 전혀 다른 경험으로 전달될 수 있다는 것을 직접
            경험했습니다.
          </p>
        </div>
      </div>
    </section>
  )
}

export default AboutMe
