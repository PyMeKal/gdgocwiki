import FormPage from './FormPage.jsx'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import ButtonLink from '../components/ButtonLink.jsx'
import Notice from '../components/Notice.jsx'
import WikiDocument from '../components/WikiDocument.jsx'
import { parseWikiJson, readWikiJson } from '../utils/importWiki.js'
import { saveWiki } from '../utils/wiki.js'
import { wikiPath } from '../utils/paths.js'

function JsonWikiImport() {
  const { wikiId } = useParams()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [saved, setSaved] = useState(false)
  // 파일을 바꾸거나 직접 입력하면 이전 파일 읽기 결과가 최신 미리보기를 덮어쓰지 못하게 합니다.
  const request = useRef(0)

  async function selectFile(event) {
    const file = event.target.files?.[0]
    const current = ++request.current
    setResult(null)
    setError('')
    setSaved(false)
    setReading(false)
    if (!file) return
    setReading(true)
    try {
      const parsed = await readWikiJson(file)
      if (current === request.current) setResult(parsed)
    } catch (fileError) {
      if (current === request.current) setError(fileError.message)
    } finally {
      if (current === request.current) setReading(false)
    }
  }

  function parseText(event) {
    event.preventDefault()
    ++request.current
    setReading(false)
    setSaved(false)
    try {
      setResult(parseWikiJson(text))
      setError('')
    } catch (parseError) {
      setResult(null)
      setError(parseError.message)
    }
  }

  function generate() {
    // 미리보기 단계에서는 저장하지 않고, 사용자가 저장 버튼을 눌렀을 때만 현재 위키를 교체합니다.
    try {
      saveWiki(result.wiki)
      setSaved(true)
      setError('')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  return (
    <>

      <section className="wiki-import-page">

        <h2>JSON으로 위키 만들기</h2>
        <p className="intro">title·category·content가 있는 JSON을 입력하면 content의 ## 제목을 목차와 본문 섹션으로 만듭니다.</p>
        <form className="panel" onSubmit={parseText}>
          <h2>JSON 입력</h2>
          <p className="muted small"><a href="/examples/wiki.json" download>예시 JSON 다운로드</a> · <Link to={`${wikiPath(wikiId)}/preview`}>현재 위키 보기</Link></p>
          <div className="field">
            <label htmlFor="wiki-json-file">JSON 파일 (최대 5MB)</label>
            <input id="wiki-json-file" type="file" accept=".json,application/json" onChange={selectFile} />
          </div>
          <div className="field">
            <label htmlFor="wiki-json-text">또는 JSON 직접 입력</label>
            <textarea id="wiki-json-text" rows={10} spellCheck={false} value={text} onChange={(event) => {
              ++request.current
              setText(event.target.value)
              setResult(null)
              setSaved(false)
              setReading(false)
              setError('')
            }} placeholder={'{"title":"문서 제목","category":"EVENT","content":"##개요\\n본문"}'} />
          </div>
          <div className="actions"><button className="button" type="submit" disabled={!text.trim() || reading}>입력한 JSON 미리보기</button></div>
          <Notice>파일은 서버로 전송하지 않습니다. 미리보기를 확인한 뒤 저장하면 이 브라우저의 현재 위키가 새 문서로 교체됩니다. 기존 문서를 보관하려면 먼저 편집 화면에서 JSON을 복사해주세요.</Notice>
          {reading && <p role="status">JSON 파일을 읽고 있습니다.</p>}
          {error && <p className="upload-error" role="alert">{error}</p>}
          {result && (
            <>
              {result.warnings.length > 0 && <div className="notice" role="status"><p>다음 항목을 확인해주세요.</p><ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
              <div className="actions"><button className="button primary" type="button" onClick={generate}>현재 위키로 저장</button>{saved && <ButtonLink to={`${wikiPath(wikiId)}/preview`}>생성된 위키 보기</ButtonLink>}</div>
              {saved && <p role="status">위키를 저장했습니다.</p>}
            </>
          )}
        </form>
        {result && <section className="wiki-preview" aria-labelledby="wiki-preview-title"><h2 id="wiki-preview-title">미리보기</h2><article className="wiki-article"><WikiDocument wiki={result.wiki} /></article></section>}
      </section>
    </>
  )
}

export default function WikiImportPage() {
  return <FormPage><details className="json-import"><summary>JSON으로 위키 가져오기</summary><JsonWikiImport /></details></FormPage>
}
