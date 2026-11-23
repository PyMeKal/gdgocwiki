import Skeleton from 'react-loading-skeleton'
import { Link } from 'react-router'
import { useState } from 'react'
import { prepareWiki } from '../utils/wiki.js'
import WikiContent from './WikiContent.jsx'
import WikiInfobox from './WikiInfobox.jsx'
import WikiSection from './WikiSection.jsx'

function Contents({ sections }) {
  return (
    <ol>{sections.map((section) => (
      <li key={section.id}>
        <button className="toc-item" type="button" aria-controls={section.id} onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{section.number}. {section.title}</button>
        {section.sections.length > 0 && <Contents sections={section.sections} />}
      </li>
    ))}</ol>
  )
}

function Sections({ sections, depth = 0, editPath }) {
  return sections.map((section) => (
    <WikiSection key={section.id} {...section} depth={depth}
      actions={editPath && <Link className="button section-edit" to={`${editPath}?section=${encodeURIComponent(section.id)}`} aria-label={`${section.number}. ${section.title} 섹션 편집`}>편집</Link>}>
      <WikiContent blocks={section.blocks} />
      <Sections sections={section.sections} depth={depth + 1} editPath={editPath} />
    </WikiSection>
  ))
}

export default function WikiDocument({ wiki, wikiId, pages, actions, editPath, updatedAt, loading = false }) {
  const [contentsHidden, setContentsHidden] = useState(false)
  // 목차와 본문이 같은 트리·번호·ID를 사용해야 섹션 순서가 바뀌어도 링크가 일치합니다.
  const { description, sections, footnotes, infobox, warnings } = loading ? { sections: [], footnotes: [], warnings: [] } : prepareWiki(wiki, { wikiId, pages })
  return (
    <>
      <header className="article-header">
        <div className="article-title-row"><h1>{loading ? <Skeleton width="60%" /> : wiki.title}</h1>{!editPath && actions}</div>
        {loading && <p className="article-modified">Last edited: <Skeleton width={90} inline /></p>}
        {typeof updatedAt === 'string' && Number.isFinite(Date.parse(updatedAt)) && <p className="article-modified"><time dateTime={updatedAt}>Last edited: {new Date(updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' }).replaceAll(' ', '').replace(/\.$/, '')}</time></p>}
        {loading && <p className="muted small wiki-text"><Skeleton count={2.5} /></p>}
        {wiki?.description && <div className="muted small"><WikiContent blocks={description} /></div>}
        {editPath && <div className="article-tools"><span>Article</span><Link to={editPath} aria-label="전체 문서 편집">편집</Link>{actions}</div>}
        {(loading || wiki.category) && <p className="category">분류: {loading ? <Skeleton width={70} inline /> : wiki.category}</p>}
      </header>
      {warnings.length > 0 && <ul className="notice" aria-label="주석 확인 사항">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {/* 오른쪽 배치도 목차 다음에 두어 모바일에서는 자연스럽게 본문 위로 쌓이게 합니다. */}
      {infobox?.placement === 'top' && <WikiInfobox infobox={infobox} />}
      {sections.length > 0 && <nav className="toc" aria-label="문서 목차"><div className="toc-heading"><h2>목차</h2><button type="button" aria-expanded={!contentsHidden} aria-controls="wiki-contents" onClick={() => setContentsHidden((hidden) => !hidden)}>[{contentsHidden ? '펼치기' : '숨기기'}]</button></div><div id="wiki-contents" hidden={contentsHidden}><Contents sections={sections} /></div></nav>}
      {infobox && infobox.placement !== 'top' && <WikiInfobox infobox={infobox} />}
      <div className="wiki-sections">{loading ? [0, 1, 2].map((row) => <section className="wiki-section" key={row}><h2 className="wiki-section-heading"><Skeleton width="40%" /></h2><p><Skeleton count={3.5} /></p></section>) : <Sections sections={sections} editPath={editPath} />}</div>
      {footnotes.length > 0 && (
        <section className="footnotes" aria-labelledby="footnotes-title">
          <h2 id="footnotes-title">주석</h2>
          <ol>{footnotes.map(({ number, content, url, references }) => (
            <li id={`footnote-${number}`} key={number}>
              {references.length === 0 ? <span>[{number}]</span> : references.map((id, index) => (
                <a key={id} href={`#${id}`} aria-label={`주석 ${number} 본문 ${index + 1}로 돌아가기`}>[{number}{index ? `-${index + 1}` : ''}]</a>
              ))}{' '}{content}
              {url && <> <a href={url} target="_blank" rel="noopener noreferrer">출처</a></>}
            </li>
          ))}</ol>
        </section>
      )}
      {wiki?.references?.length > 0 && (
        <section className="footnotes" aria-labelledby="references-title">
          <h2 id="references-title">참고 자료</h2>
          <ul>{wiki.references.map((reference, index) => <li key={index}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}</a></li>)}</ul>
        </section>
      )}
    </>
  )
}
