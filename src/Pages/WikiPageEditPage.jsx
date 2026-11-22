import Skeleton from 'react-loading-skeleton'
import { useEffect, useState } from 'react'
import { Form, Link, useActionData, useBlocker, useLoaderData, useNavigation, useParams, useSearchParams } from 'react-router'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import Notice from '../components/Notice.jsx'
import { wikiPagePath } from '../utils/paths.js'

function PageEditor({ page, editContent, sectionId, returnPath }) {
  // 재조회·저장 실패로 편집 내용이나 편집을 시작한 버전이 바뀌지 않게 유지합니다.
  const [original] = useState(() => ({
    content: editContent,
    version: page.version,
  }))
  const [content, setContent] = useState(original.content)
  const result = useActionData()
  const navigation = useNavigation()
  const saving = navigation.state !== 'idle'
  const dirty = content !== original.content
  // 같은 편집 URL로 보내는 저장 폼은 허용하고, 편집 범위를 벗어나는 이동만 확인합니다.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && (
    currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
  ))

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

  return (
    <Form method="post" aria-busy={saving}>
      <input type="hidden" name="version" value={original.version} />
      <div className="panel field">
        <label htmlFor="edit-page-content">{sectionId === null ? '전체 문서 본문' : '선택한 섹션의 제목과 본문'}</label>
        <p id="edit-page-help" className="muted small">각 섹션은 <code>## 제목</code>으로 시작합니다. {sectionId === null ? '모든 섹션과 문서 소개를 수정할 수 있습니다.' : '선택한 섹션만 수정하며, 다른 섹션은 그대로 유지됩니다.'}</p>
        <textarea id="edit-page-content" name="content" rows={20} aria-describedby="edit-page-help" value={content} disabled={saving} onChange={(event) => setContent(event.target.value)} />
      </div>
      <div className="editor-save">
        {result?.error && <p className="upload-error" role="alert">{result.error} 입력한 내용은 이 화면에 남아 있습니다.</p>}
        <p className="muted small">{dirty ? '저장하지 않은 변경 사항이 있습니다.' : '저장되지 않은 변경 사항이 없습니다.'}</p>
        <div className="actions">
          <button className="button primary" type="submit" disabled={saving}>{saving ? '저장 중…' : '편집 완료'}</button>
          <ButtonLink to={returnPath}>문서로 돌아가기</ButtonLink>
        </div>
      </div>
    </Form>
  )
}

export default function WikiPageEditPage({ loading = false, wikiId: pendingWikiId, pagesId: pendingPagesId, mainId = 'main' }) {
  const data = useLoaderData()
  const { page, editContent } = loading ? {} : data
  const params = useParams()
  const wikiId = pendingWikiId ?? params.wikiId
  const pagesId = pendingPagesId ?? params.pagesId
  const [searchParams] = useSearchParams()
  const sectionId = searchParams.get('section')
  const returnPath = wikiPagePath(wikiId, pagesId)
  return (
    <main id={mainId} className="container form-page wiki-edit-page" aria-busy={loading}>
      <title>{loading ? '문서 편집 · 대화위키' : `${page.title} 수정 · 대화위키`}</title>
      <Breadcrumb><Link to={returnPath}>{loading ? <Skeleton width={100} /> : page.title}</Link> / 문서 편집</Breadcrumb>
      <h1>{sectionId === null ? '전체 문서 편집' : '섹션 편집'}</h1>
      <Notice>편집을 완료하면 서버에 저장하고 원래 문서로 돌아갑니다. 본문에 <code>[* 주석 내용]</code>을 입력하면 주석이 표시됩니다.</Notice>
      {loading ? <div className="panel field"><p>{sectionId === null ? '전체 문서 본문' : '선택한 섹션의 제목과 본문'}</p><p><Skeleton count={12} /></p></div> : <PageEditor key={`${returnPath}?section=${sectionId}`} page={page} editContent={editContent} sectionId={sectionId} returnPath={returnPath} />}
    </main>
  )
}
