import { useRecentWikis } from '../api/queries.js'
import Skeleton from 'react-loading-skeleton'
import { useState } from 'react'
import { Link, useFetcher, useParams } from 'react-router'
import ChatFileUpload from '../components/form/ChatFileUpload.jsx'
import PasswordInput from '../components/common/PasswordInput.jsx'
import { wikiPath } from '../utils/paths.js'

export default function FormPage() {
  const { wikiId } = useParams()
  const { wikis, isPending: loading } = useRecentWikis(wikiId, true)
  const [chat, setChat] = useState(null)
  const fetcher = useFetcher()
  const busy = fetcher.state !== 'idle'

  function handleSubmit(event) {
    event.preventDefault()
    if (busy || !chat) return
    const form = new FormData(event.currentTarget)
    // 드래그로 선택한 파일도 파일 선택 입력과 동일하게 전송합니다.
    form.set('chat', chat.file)
    fetcher.submit(form, { method: 'post', encType: 'multipart/form-data' })
  }

  return (
    <>
      <title>Import Chats · WikiTalk</title>
      <meta name="description" content="카카오톡 대화 텍스트 파일을 첨부하는 화면" />
      <main id="main" className="container form-page import-page" aria-busy={loading}>
        <div className="import-intro">
          <p className="eyebrow">A LITTLE LESS SCROLL. A LOT MORE KNOW.</p>
          <h1>Good chats.<br />Great knowledge.</h1>
          <p className="intro">Turn your chat history into a wiki worth keeping. Every insight, finally connected.</p>
        </div>

        <form className="panel" aria-labelledby="form-title" onSubmit={handleSubmit} aria-busy={busy}>
          <h2 id="form-title"><span className="step-number">01</span> Add your conversation</h2>
          <input type="hidden" name="wikiId" value={fetcher.data?.wiki?.id ?? ''} />
          <input type="hidden" name="chatId" value={fetcher.data?.chat?.id ?? ''} />
          <ChatFileUpload value={chat} onChange={setChat} disabled={busy || Boolean(fetcher.data?.chat)} />
          <div className="field">
            <label htmlFor="wiki-title">Wiki name</label>
            <input id="wiki-title" name="title" type="text" placeholder="예: 2026년 부산 여행" maxLength="100" required readOnly={busy || Boolean(fetcher.data?.wiki)} />
          </div>
          <details className="import-options"><summary>위키 비밀번호 (선택)</summary><div className="field">
            <label className="sr-only" htmlFor="wiki-password">위키 비밀번호 (선택)</label>
            <PasswordInput id="wiki-password" name="password" autoComplete="new-password" aria-describedby="password-help" readOnly={busy || Boolean(fetcher.data?.wiki)} />
            <p id="password-help" className="muted small">설정하면 인증한 브라우저에서만 위키를 열 수 있습니다. 비워두면 비밀번호 없이 열립니다.</p>
          </div>
          </details>

          {fetcher.data?.error && <p className="upload-error" role="alert">{fetcher.data.error}</p>}
          <div className="actions">
            <button className="button primary" type="submit" disabled={busy || !chat}>{fetcher.state !== 'idle' ? '업로드 중…' : 'Generate my wiki'}<img src="/design/generate.svg" alt="" /></button>
          </div>
        </form>

        <p className="privacy-note"><img src="/design/lock.svg" alt="" />업로드 전 대화 참여자의 동의를 확인해주세요.</p>
        {(loading || wikis.length > 0) && <section className="recent-wiki">
          <h2>Pick up where you left off</h2>
          {loading && wikis.length === 0 && <div className="recent-wiki-card"><Skeleton width={180} /></div>}
          {wikis.slice(0, 3).map((wiki) => <Link key={wiki.id} className="recent-wiki-card" to={wikiPath(wiki.id)}><span className="recent-wiki-icon"><img src="/design/recent.svg" alt="" /></span><span><strong>{wiki.name}</strong><small>대화로 만든 문서를 살펴보세요.</small></span><img src="/design/recentArrow.svg" alt="" /></Link>)}
        </section>}
        <aside className="help-box" aria-labelledby="help-title">
          <h2 id="help-title">대화 파일은 어떻게 준비하나요?</h2>
          <ol>
            <li>카카오톡에서 정리하고 싶은 단톡방을 열어주세요.</li>
            <li>채팅방 설정에서 대화 내용 내보내기를 선택해주세요.</li>
            <li>저장한 텍스트(.txt) 파일을 위에서 선택해주세요.</li>
          </ol>
          <p className="muted small">대화에 포함된 개인정보를 확인하고, 참여자들의 동의를 받아 사용해주세요.</p>
        </aside>
      </main>
    </>
  )
}
