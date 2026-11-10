import { useState } from 'react'
import ButtonLink from '../components/ButtonLink.jsx'
import WikiContent from '../components/WikiContent.jsx'
import { loadWiki, prepareWiki } from '../utils/wiki.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Notice from '../components/Notice.jsx'
import Tag from '../components/Tag.jsx'
import WikiSection from '../components/WikiSection.jsx'

export default function WikiPage() {
  const [{ wiki, error }] = useState(loadWiki)
  const { sections, footnotes } = prepareWiki(wiki)

  return (
    <>
      <title>{`${wiki.title} · 대화위키`}</title>
      <meta name="description" content={wiki.description} />
      <main id="main" className="container wiki-layout">
        <article className="wiki-article">
          <Breadcrumb>위키 문서</Breadcrumb>
          <header className="article-header">
            <Tag>예시 문서</Tag>
            <div className="article-title-row"><h1>{wiki.title}</h1><ButtonLink href="./?page=wiki-edit">위키 수정</ButtonLink></div>
            <p className="muted small">{wiki.description}</p>
          </header>
          <p className="category">분류: <a href="#main">2026년 여행</a> <span aria-hidden="true">|</span> <a href="#main">부산광역시</a></p>
          <Notice>이 문서는 화면 구성을 위한 예시입니다. 실제 대화에서 생성되거나 나무위키에 저장된 문서가 아닙니다.</Notice>

          {error && <p className="upload-error" role="alert">{error}</p>}

          <nav className="toc" aria-label="문서 목차">
            <h2>목차</h2>
            <ol>
              {sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
            </ol>
          </nav>

          {sections.map((section, index) => (
            <WikiSection key={section.id} id={section.id} number={index + 1} title={section.title}>
              <WikiContent blocks={section.blocks} />
            </WikiSection>
          ))}
          {footnotes.length > 0 && (
            <section className="footnotes" aria-labelledby="footnotes-title">
              <h2 id="footnotes-title">주석</h2>
              <ol>
                {footnotes.map(({ number, content }) => (
                  <li id={`footnote-${number}`} key={number}>
                    <a href={`#footnote-ref-${number}`} aria-label={`주석 ${number} 본문으로 돌아가기`}>[{number}]</a>{' '}{content}
                  </li>
                ))}
              </ol>
            </section>
          )}
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
