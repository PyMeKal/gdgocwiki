import { useEffect, useState } from 'react'
import { useBlocker, useParams } from 'react-router'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import Notice from '../components/Notice.jsx'
import { loadWiki, saveWiki, validateWiki } from '../utils/wiki.js'
import { wikiPath } from '../utils/paths.js'

function BlockEditor({ block, id, onChange }) {
  if (block.type === 'paragraph' || block.type === 'list') {
    const isList = block.type === 'list'
    return (
      <div className="field">
        <label htmlFor={id}>{isList ? '목록 내용 (한 줄에 한 항목)' : '본문 내용'}</label>
        <textarea id={id} rows={isList ? 6 : 4} value={isList ? block.items.join('\n') : block.text}
          onChange={(event) => onChange(isList ? { ...block, items: event.target.value.split('\n') } : { ...block, text: event.target.value })} />
      </div>
    )
  }
  if (block.type === 'image' || block.type === 'link') {
    const fields = block.type === 'image' ? [['src', '이미지 주소'], ['alt', '이미지 대체 텍스트'], ['caption', '이미지 설명']] : [['url', '링크 주소'], ['label', '링크 이름']]
    return fields.map(([key, label]) => (
      <div className="field" key={key}>
        <label htmlFor={`${id}-${key}`}>{label}</label>
        <input id={`${id}-${key}`} type="text" value={block[key]} onChange={(event) => onChange({ ...block, [key]: event.target.value })} />
      </div>
    ))
  }
  return (
    <fieldset className="table-editor">
      <legend>표 내용</legend>
      <div className="field">
        <label htmlFor={`${id}-caption`}>표 설명</label>
        <input id={`${id}-caption`} type="text" value={block.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} />
      </div>
      {block.rows.map((row, rowIndex) => (
        <fieldset className="table-editor-row" key={rowIndex}>
          <legend>{block.header && rowIndex === 0 ? '표 머리글' : `${rowIndex + (block.header ? 0 : 1)}행`}</legend>
          {row.map((cell, columnIndex) => (
            <div className="field" key={columnIndex}>
              <label htmlFor={`${id}-${rowIndex}-${columnIndex}`}>{columnIndex + 1}열</label>
              <textarea id={`${id}-${rowIndex}-${columnIndex}`} rows={2} value={cell}
                onChange={(event) => onChange({ ...block, rows: block.rows.map((cells, i) => i === rowIndex ? cells.map((value, j) => j === columnIndex ? event.target.value : value) : cells) })} />
            </div>
          ))}
          {!(block.header && rowIndex === 0) && (
            <button className="button" type="button" disabled={block.rows.length <= (block.header ? 2 : 1)}
              onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== rowIndex) })}>행 삭제</button>
          )}
        </fieldset>
      ))}
      <button className="button" type="button" onClick={() => onChange({ ...block, rows: [...block.rows, block.rows[0].map(() => '')] })}>행 추가</button>
    </fieldset>
  )
}

function newSection() {
  return { id: `section-${crypto.randomUUID()}`, title: '', blocks: [{ type: 'paragraph', text: '' }], sections: [] }
}

function SectionEditors({ sections, onChange, prefix = '' }) {
  function updateSection(id, next) {
    // 변경한 형제 목록을 부모로 전달하는 방식을 재귀적으로 반복해 중첩 구조를 유지합니다.
    onChange(sections.map((section) => section.id === id ? next : section))
  }
  function move(index, offset) {
    const next = [...sections]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    onChange(next)
  }
  return sections.map((section, index) => {
    const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`
    return (
      <section className="panel" key={section.id} aria-labelledby={`edit-heading-${section.id}`}>
        <h2 id={`edit-heading-${section.id}`}>목차 {number}</h2>
        <div className="editor-section-actions" role="group" aria-label={`목차 ${number} 관리`}>
          <button className="button" type="button" disabled={index === 0} onClick={() => move(index, -1)}>위로</button>
          <button className="button" type="button" disabled={index === sections.length - 1} onClick={() => move(index, 1)}>아래로</button>
          <button className="button" type="button" onClick={() => onChange(sections.filter(({ id }) => id !== section.id))}>목차 삭제</button>
          <button className="button" type="button" onClick={() => updateSection(section.id, { ...section, sections: [...(section.sections || []), newSection()] })}>하위 목차 추가</button>
        </div>
        <div className="field">
          <label htmlFor={`title-${section.id}`}>목차 {number} 제목</label>
          <input id={`title-${section.id}`} type="text" value={section.title} onChange={(event) => updateSection(section.id, { ...section, title: event.target.value })} />
        </div>
        {section.blocks.map((block, blockIndex) => (
          <BlockEditor key={blockIndex} block={block} id={`block-${section.id}-${blockIndex}`}
            onChange={(next) => updateSection(section.id, { ...section, blocks: section.blocks.map((value, i) => i === blockIndex ? next : value) })} />
        ))}
        <SectionEditors sections={section.sections || []} prefix={number} onChange={(next) => updateSection(section.id, { ...section, sections: next })} />
      </section>
    )
  })
}

export default function WikiEditPage() {
  const { wikiId } = useParams()
  const [{ wiki: initialWiki, error: loadError }] = useState(loadWiki)
  const [draft, setDraft] = useState(initialWiki)
  const [savedWiki, setSavedWiki] = useState(initialWiki)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonBase, setJsonBase] = useState('')
  // 아직 적용하지 않은 JSON도 변경 사항으로 취급해 화면을 떠날 때 입력 유실을 경고합니다.
  const jsonDirty = jsonText !== jsonBase
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedWiki) || jsonDirty
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('저장하지 않은 변경 사항이 있습니다. 저장하지 않고 이동할까요?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeaving = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [dirty])

  function update(next) {
    setDraft(next)
    setSaved(false)
    setError('')
  }

  function handleSave(event) {
    event.preventDefault()
    // JSON을 고친 뒤 이전 폼 데이터만 저장되는 혼동을 막습니다.
    if (jsonDirty) {
      setError('수정한 JSON의 내용 적용을 먼저 눌러주세요. 입력한 JSON은 그대로 유지됩니다.')
      return
    }
    try {
      saveWiki(draft)
      setSavedWiki(draft)
      setSaved(true)
      setError('')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  return (
    <>
      <title>{`${draft.title || '위키'} 수정 · 대화위키`}</title>
      <main id="main" className="container form-page wiki-edit-page">
        <Breadcrumb>위키 수정</Breadcrumb>
        <h1>위키 수정</h1>
        <p className="intro">문서 제목과 목차, 본문을 수정하세요. 목차 이름은 본문 제목에도 함께 반영됩니다.</p>
        <Notice>수정 내용은 이 브라우저에 저장됩니다. 본문·목록·표에서 <code>[* 주석 내용]</code>을 입력하면 주석이 표시됩니다. 공용 주석은 <code>[^주석ID]</code>로 연결하며, 하단의 JSON 전체 편집에서 내용을 수정할 수 있습니다.</Notice>
        {loadError && <p className="upload-error" role="alert">{loadError}</p>}

        <form onSubmit={handleSave}>
          <section className="panel" aria-labelledby="document-settings-title">
            <h2 id="document-settings-title">문서 정보</h2>
            <div className="field">
              <label htmlFor="edit-wiki-title">문서 제목</label>
              <input id="edit-wiki-title" type="text" maxLength={100} required value={draft.title} onChange={(event) => update({ ...draft, title: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="edit-wiki-description">문서 소개</label>
              <textarea id="edit-wiki-description" rows={2} value={draft.description} onChange={(event) => update({ ...draft, description: event.target.value })} />
            </div>
          </section>

          <SectionEditors sections={draft.sections} onChange={(sections) => update({ ...draft, sections })} />
          <div className="actions">
            <button className="button" type="button" onClick={() => update({ ...draft, sections: [...draft.sections, newSection()] })}>목차 추가</button>
          </div>
          <details className="panel json-editor" onToggle={(event) => {
            // 편집 중인 JSON은 유지하고, 미적용 변경이 없을 때만 현재 폼 내용으로 갱신합니다.
            if (event.currentTarget.open && !jsonDirty) {
              const text = JSON.stringify(draft, null, 2)
              setJsonText(text)
              setJsonBase(text)
            }
          }}>
            <summary>JSON으로 전체 문서 편집</summary>
            <p className="muted small">브라우저에 저장된 내부 문서 구조를 수정하거나 복사할 수 있습니다. API 형식의 JSON은 JSON 입력 화면에서 가져와주세요. 적용하면 위 편집 내용이 JSON 내용으로 교체됩니다.</p>
            <div className="field">
              <label htmlFor="edit-wiki-json">문서 JSON</label>
              <textarea id="edit-wiki-json" rows={16} spellCheck={false} value={jsonText} onChange={(event) => {
                setJsonText(event.target.value)
                setSaved(false)
              }} />
            </div>
            <button className="button" type="button" onClick={() => {
              try {
                if (new TextEncoder().encode(jsonText).length > 5 * 1024 * 1024) throw new Error('JSON은 5MB 이하로 입력해주세요.')
                const wiki = JSON.parse(jsonText.replace(/^\uFEFF/, ''))
                validateWiki(wiki)
                update(wiki)
                setJsonBase(jsonText)
              } catch (parseError) {
                setError(parseError.message)
              }
            }}>JSON 내용 적용</button>
          </details>
          <div className="editor-save">
            {error && <p className="upload-error" role="alert">{error}</p>}
            {saved && <p role="status">저장했습니다. 위키로 돌아가 수정한 내용을 확인하세요.</p>}
            <p className="muted small">{dirty ? '저장하지 않은 변경 사항이 있습니다.' : '저장되지 않은 변경 사항이 없습니다.'}</p>
            <div className="actions">
              <button className="button primary" type="submit">저장하기</button>
              <ButtonLink to={`${wikiPath(wikiId)}/preview`}>위키로 돌아가기</ButtonLink>
            </div>
          </div>
        </form>
      </main>
    </>
  )
}
