import { useEffect, useState } from 'react'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import Notice from '../components/Notice.jsx'
import { loadWiki, saveWiki } from '../utils/wiki.js'

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

export default function WikiEditPage() {
  const [{ wiki: initialWiki, error: loadError }] = useState(loadWiki)
  const [draft, setDraft] = useState(initialWiki)
  const [savedWiki, setSavedWiki] = useState(initialWiki)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedWiki)

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

  function updateSection(id, next) {
    update({ ...draft, sections: draft.sections.map((section) => section.id === id ? next : section) })
  }

  function moveSection(index, offset) {
    const sections = [...draft.sections]
    ;[sections[index], sections[index + offset]] = [sections[index + offset], sections[index]]
    update({ ...draft, sections })
  }

  function handleSave(event) {
    event.preventDefault()
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
        <Notice>수정 내용은 이 브라우저에 저장됩니다. 본문·목록·표에서 <code>[* 주석 내용]</code>을 입력하면 주석이 표시됩니다. 주석 내용을 바꾸거나 해당 구문을 지워 수정·삭제할 수 있습니다.</Notice>
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

          {draft.sections.map((section, index) => (
            <section className="panel" key={section.id} aria-labelledby={`edit-heading-${section.id}`}>
              <h2 id={`edit-heading-${section.id}`}>목차 {index + 1}</h2>
              <div className="editor-section-actions" role="group" aria-label={`목차 ${index + 1} 관리`}>
                <button className="button" type="button" disabled={index === 0} onClick={() => moveSection(index, -1)}>위로</button>
                <button className="button" type="button" disabled={index === draft.sections.length - 1} onClick={() => moveSection(index, 1)}>아래로</button>
                <button className="button" type="button" disabled={draft.sections.length === 1} onClick={() => update({ ...draft, sections: draft.sections.filter(({ id }) => id !== section.id) })}>목차 삭제</button>
              </div>
              <div className="field">
                <label htmlFor={`title-${section.id}`}>목차 {index + 1} 제목</label>
                <input id={`title-${section.id}`} type="text" required value={section.title} onChange={(event) => updateSection(section.id, { ...section, title: event.target.value })} />
              </div>
              {section.blocks.map((block, blockIndex) => (
                <BlockEditor key={blockIndex} block={block} id={`block-${section.id}-${blockIndex}`}
                  onChange={(next) => updateSection(section.id, { ...section, blocks: section.blocks.map((value, i) => i === blockIndex ? next : value) })} />
              ))}
            </section>
          ))}

          <div className="actions">
            <button className="button" type="button" onClick={() => update({ ...draft, sections: [...draft.sections, { id: `section-${crypto.randomUUID()}`, title: '', blocks: [{ type: 'paragraph', text: '' }] }] })}>목차 추가</button>
          </div>
          <div className="editor-save">
            {error && <p className="upload-error" role="alert">{error}</p>}
            {saved && <p role="status">저장했습니다. 위키로 돌아가 수정한 내용을 확인하세요.</p>}
            <p className="muted small">{dirty ? '저장하지 않은 변경 사항이 있습니다.' : '저장되지 않은 변경 사항이 없습니다.'}</p>
            <div className="actions">
              <button className="button primary" type="submit">저장하기</button>
              <ButtonLink href="./?page=wiki">위키로 돌아가기</ButtonLink>
            </div>
          </div>
        </form>
      </main>
    </>
  )
}
