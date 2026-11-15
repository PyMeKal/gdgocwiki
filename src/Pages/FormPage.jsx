import { useState } from 'react'
import { useFetcher } from 'react-router'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import ChatFileUpload from '../components/ChatFileUpload.jsx'
import Notice from '../components/Notice.jsx'
import { wikiPath } from '../utils/paths.js'

export default function FormPage() {
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
      <title>대화 올리기 · 대화위키</title>
      <meta name="description" content="카카오톡 대화 텍스트 파일을 첨부하는 화면" />
      <main id="main" className="container form-page">
        <Breadcrumb>대화 올리기</Breadcrumb>
        <h1>대화 올리기</h1>
        <p className="intro">함께 나눈 대화를 위키 문서로 정리해보세요.</p>

        <form className="panel" aria-labelledby="form-title" onSubmit={handleSubmit} aria-busy={busy}>
          <h2 id="form-title">새 위키 문서</h2>
          <input type="hidden" name="wikiId" value={fetcher.data?.wiki?.id ?? ''} />
          <input type="hidden" name="chatId" value={fetcher.data?.chat?.id ?? ''} />
          <p className="muted">문서의 제목을 정하고 카카오톡 대화 파일을 선택해주세요.</p>
          <div className="field">
            <label htmlFor="wiki-title">위키 제목</label>
            <input id="wiki-title" name="title" type="text" placeholder="예: 2026년 부산 여행" maxLength="100" required readOnly={busy || Boolean(fetcher.data?.wiki)} />
          </div>
          <div className="field">
            <label htmlFor="wiki-password">위키 비밀번호 (선택)</label>
            <input id="wiki-password" name="password" type="password" autoComplete="new-password" aria-describedby="password-help" readOnly={busy || Boolean(fetcher.data?.wiki)} />
            <p id="password-help" className="muted small">설정하면 인증한 브라우저에서만 위키를 열 수 있습니다. 비워두면 비밀번호 없이 열립니다.</p>
          </div>
          <p className="muted small"><a href="/examples/kakao-chat.txt" download>실험용 대화 파일 다운로드</a></p>
          <ChatFileUpload value={chat} onChange={setChat} disabled={busy || Boolean(fetcher.data?.chat)} />
          {chat && (
            <section className="chat-preview" aria-labelledby="preview-title">
              <h3 id="preview-title">대화 미리보기</h3>
              <p className="muted small">처음 2,000자까지 표시합니다.</p>
              <pre>{chat.text.slice(0, 2000)}</pre>
            </section>
          )}
          <Notice>업로드 버튼을 누르면 위키를 만들고 선택한 대화 파일을 서버로 전송합니다. 제출 후 문서 생성 화면으로 이동합니다. 개발 모드에서는 예시 변환기가 AI 생성을 대신합니다.</Notice>
          {fetcher.data?.error && <p className="upload-error" role="alert">{fetcher.data.error}</p>}
          <div className="actions">
            <button className="button primary" type="submit" disabled={busy || !chat}>{busy ? '업로드 중…' : '위키 만들기'}</button>
            <ButtonLink to={wikiPath()}>예시 위키 보기</ButtonLink>
          </div>
        </form>

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
