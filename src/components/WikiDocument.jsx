import { prepareWiki } from '../utils/wiki.js'
import WikiContent from './WikiContent.jsx'
import WikiInfobox from './WikiInfobox.jsx'
import WikiSection from './WikiSection.jsx'

function Contents({ sections }) {
  return (
    <ol>{sections.map((section) => (
      <li key={section.id}>
        <a href={`#${section.id}`}>{section.number}. {section.title}</a>
        {section.sections.length > 0 && <Contents sections={section.sections} />}
      </li>
    ))}</ol>
  )
}

function Sections({ sections, depth = 0 }) {
  return sections.map((section) => (
    <WikiSection key={section.id} {...section} depth={depth}>
      <WikiContent blocks={section.blocks} />
      <Sections sections={section.sections} depth={depth + 1} />
    </WikiSection>
  ))
}

export default function WikiDocument({ wiki, actions }) {
  // 목차와 본문이 같은 트리·번호·ID를 사용해야 섹션 순서가 바뀌어도 링크가 일치합니다.
  const { sections, footnotes, infobox, warnings } = prepareWiki(wiki)
  return (
    <>
      <header className="article-header">
        <div className="article-title-row"><h1>{wiki.title}</h1>{actions}</div>
        {wiki.description && <p className="muted small wiki-text">{wiki.description}</p>}
      </header>
      {warnings.length > 0 && <ul className="notice" aria-label="주석 확인 사항">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {/* 오른쪽 배치도 목차 다음에 두어 모바일에서는 자연스럽게 본문 위로 쌓이게 합니다. */}
      {infobox?.placement === 'top' && <WikiInfobox infobox={infobox} />}
      {sections.length > 0 && <nav className="toc" aria-label="문서 목차"><h2>목차</h2><Contents sections={sections} /></nav>}
      {infobox && infobox.placement !== 'top' && <WikiInfobox infobox={infobox} />}
      <div className="wiki-sections"><Sections sections={sections} /></div>
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
      {/*wiki.category && <p className="category">분류: {wiki.category}</p>*/}
      {wiki.references?.length > 0 && (
        <section className="footnotes" aria-labelledby="references-title">
          <h2 id="references-title">참고 자료</h2>
          <ul>{wiki.references.map((reference, index) => <li key={index}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}</a></li>)}</ul>
        </section>
      )}
    </>
  )
}
