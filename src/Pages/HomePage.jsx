import { Link } from 'react-router'
import ButtonLink from '../components/common/ButtonLink.jsx'
import Tag from '../components/common/Tag.jsx'
import { wikiPagePath, wikiPath } from '../utils/paths.js'

export default function HomePage() {
  return (
    <>
      <title>대화위키 · 홈</title>
      <meta name="description" content="단톡방의 대화를 우리만의 위키로 정리하는 대화위키" />
      <main id="main" className="container home">
        <section className="welcome" aria-labelledby="welcome-title">
          <p className="eyebrow">우리의 대화가, 하나의 기록으로</p>
          <h1 id="welcome-title">안녕하세요, 대화위키입니다.</h1>
          <p className="intro">단톡방에 흩어진 약속과 정보를 한곳에 모아보세요.<br />함께 나눈 이야기를 찾기 쉬운 위키로 남깁니다.</p>
          <div className="actions">
            <ButtonLink to="/form" primary>대화 올리기 <span aria-hidden="true">→</span></ButtonLink>
            <ButtonLink to={wikiPath()}>예시 위키 둘러보기</ButtonLink>
          </div>
        </section>

        <section className="home-section" aria-labelledby="how-title">
          <h2 id="how-title">이렇게 이용해요</h2>
          <ol className="steps">
            <li><span className="step-number" aria-hidden="true">01</span><h3>대화 내보내기</h3><p>카카오톡 단톡방의 대화 내용을<br />텍스트 파일로 저장해요.</p></li>
            <li><span className="step-number" aria-hidden="true">02</span><h3>파일 첨부하기</h3><p>대화 파일을 첨부하고<br />위키 문서의 제목을 정해요.</p></li>
            <li><span className="step-number" aria-hidden="true">03</span><h3>위키로 모아보기</h3><p>일정, 장소, 준비물을 정리한<br />우리만의 문서를 확인해요.</p></li>
          </ol>
        </section>

        <section className="home-section" aria-labelledby="example-title">
          <div className="section-heading"><h2 id="example-title">어떤 위키가 만들어질까요?</h2><span className="muted small">예시 문서</span></div>
          <Link className="example-link" to={wikiPagePath()}>
            <div><Tag>여행</Tag><h3>2026년 부산 여행</h3><p>친구들과 정한 2박 3일 일정부터 숙소, 준비물까지.</p></div>
            <span className="example-arrow" aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </>
  )
}
