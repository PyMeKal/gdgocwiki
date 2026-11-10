import Breadcrumb from '../components/Breadcrumb.jsx'
import Notice from '../components/Notice.jsx'
import Tag from '../components/Tag.jsx'
import WikiSection from '../components/WikiSection.jsx'

export default function WikiPage() {
  return (
    <>
      <title>2026년 부산 여행 · 대화위키</title>
      <meta name="description" content="친구들과 함께하는 2026년 부산 여행 위키 예시" />
      <main id="main" className="container wiki-layout">
        <article className="wiki-article">
          <Breadcrumb>위키 문서</Breadcrumb>
          <header className="article-header">
            <Tag>예시 문서</Tag>
            <h1>2026년 부산 여행</h1>
            <p className="muted small">친구들과 떠나는 2박 3일 부산 여행 기록</p>
          </header>
          <p className="category">분류: <a href="#overview">2026년 여행</a> <span aria-hidden="true">|</span> <a href="#overview">부산광역시</a></p>
          <Notice>이 문서는 화면 구성을 위한 예시입니다. 실제 대화에서 생성되거나 나무위키에 저장된 문서가 아닙니다.</Notice>

          <nav className="toc" aria-label="문서 목차">
            <h2>목차</h2>
            <ol>
              <li><a href="#overview">개요</a></li>
              <li><a href="#schedule">여행 일정</a></li>
              <li><a href="#stay">교통 및 숙소</a></li>
              <li><a href="#packing">준비물</a></li>
              <li><a href="#pending">아직 정하지 않은 것</a></li>
            </ol>
          </nav>

          <WikiSection id="overview" number={1} title="개요">
            <p>친구 4명이 함께하는 2026년 부산 여행. 단톡방에서 나눈 이야기를 바탕으로 여행 일정과 준비할 내용을 한곳에 모았다.</p>
            <table className="info-table">
              <caption className="sr-only">여행 기본 정보</caption>
              <tbody>
                <tr><th scope="row">여행 기간</th><td>2026년 12월 18일 ~ 12월 20일 (2박 3일)</td></tr>
                <tr><th scope="row">여행 장소</th><td>부산광역시 · 해운대, 광안리, 남포동</td></tr>
                <tr><th scope="row">참여 인원</th><td>4명 (민수, 지연, 서준, 수빈)</td></tr>
                <tr><th scope="row">예상 예산</th><td>1인당 30만 원 내외</td></tr>
              </tbody>
            </table>
          </WikiSection>

          <WikiSection id="schedule" number={2} title="여행 일정">
            <div className="table-scroll" role="region" aria-label="여행 일정표" tabIndex="0">
              <table className="schedule-table">
                <caption className="sr-only">날짜별 여행 일정</caption>
                <thead><tr><th scope="col">날짜</th><th scope="col">일정</th><th scope="col">비고</th></tr></thead>
                <tbody>
                  <tr><th scope="row">1일 차 · 12/18</th><td>부산역 도착 → 점심 → 숙소 체크인 → 광안리</td><td>저녁에 광안대교 야경 보기</td></tr>
                  <tr><th scope="row">2일 차 · 12/19</th><td>해운대 산책 → 해리단길 → 전포 카페거리</td><td>식당은 추후 결정</td></tr>
                  <tr><th scope="row">3일 차 · 12/20</th><td>체크아웃 → 남포동 구경 → 부산역 출발</td><td>짐 보관 장소 확인</td></tr>
                </tbody>
              </table>
            </div>
          </WikiSection>

          <WikiSection id="stay" number={3} title="교통 및 숙소">
            <ul className="content-list">
              <li><strong>교통:</strong> 서울역에서 KTX를 타고 부산역으로 이동할 예정. 열차 시간은 함께 확인 후 예매한다.</li>
              <li><strong>숙소:</strong> 광안리 인근 4인 숙소를 알아보는 중. 2박 총 40만 원 이내를 기준으로 한다.</li>
              <li><strong>현지 이동:</strong> 지하철과 버스를 이용하고, 늦은 시간에는 택시를 함께 탄다.</li>
            </ul>
          </WikiSection>

          <WikiSection id="packing" number={4} title="준비물">
            <ul className="content-list"><li>신분증, 교통카드</li><li>휴대폰 충전기, 보조배터리</li><li>따뜻한 외투, 여벌 옷, 세면도구</li><li>함께 찍을 사진을 위한 카메라</li></ul>
          </WikiSection>

          <WikiSection id="pending" number={5} title="아직 정하지 않은 것">
            <ul className="content-list"><li>KTX 출발 시간과 좌석 예매</li><li>숙소 최종 선택 및 예약 담당자</li><li>둘째 날 저녁 식당과 공금 정산 방법</li></ul>
          </WikiSection>
          <div className="article-bottom"><a href="./?page=form">새 대화 올리기 →</a><a href="#main">맨 위로 ↑</a></div>
        </article>

        <aside className="wiki-sidebar" aria-labelledby="sidebar-title">
          <div className="sidebar-box">
            <h2 id="sidebar-title">문서 안내</h2>
            <p>단톡방의 이야기를<br />한눈에 볼 수 있도록.</p>
            <dl><dt>문서 종류</dt><dd>여행 계획</dd><dt>작성 방식</dt><dd>예시 문서</dd></dl>
            <a href="./?page=form">내 대화로 시작하기 →</a>
          </div>
          <a className="back-home" href="./">← 홈으로 돌아가기</a>
        </aside>
      </main>
    </>
  )
}
