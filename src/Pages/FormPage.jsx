import { useState } from 'react'
import Breadcrumb from '../components/Breadcrumb.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import ChatFileUpload from '../components/ChatFileUpload.jsx'
import Notice from '../components/Notice.jsx'

export default function FormPage() {
  const [chat, setChat] = useState(null)

  return (
    <>
      <title>대화 올리기 · 대화위키</title>
      <meta name="description" content="카카오톡 대화 텍스트 파일을 첨부하는 화면" />
      <main id="main" className="container form-page">
        <Breadcrumb>대화 올리기</Breadcrumb>
        <h1>대화 올리기</h1>
        <p className="intro">함께 나눈 대화를 위키 문서로 정리해보세요.</p>

        {/* shortcut: 대화는 페이지 메모리에서만 보관하며, 업로드 API 구현 시 서버 전송을 연결합니다. */}
        <form className="panel" aria-labelledby="form-title" onSubmit={(event) => event.preventDefault()}>
          <h2 id="form-title">새 위키 문서</h2>
          <p className="muted">문서의 제목을 정하고 카카오톡 대화 파일을 선택해주세요.</p>
          <div className="field">
            <label htmlFor="wiki-title">문서 제목</label>
            <input id="wiki-title" name="title" type="text" placeholder="예: 2026년 부산 여행" maxLength="100" />
          </div>
          <ChatFileUpload value={chat} onChange={setChat} />
          {chat && (
            <section className="chat-preview" aria-labelledby="preview-title">
              <h3 id="preview-title">대화 미리보기</h3>
              <p className="muted small">처음 2,000자까지 표시합니다.</p>
              <pre>{chat.text.slice(0, 2000)}</pre>
            </section>
          )}
          <Notice>파일은 이 페이지에서만 읽으며 서버로 전송하거나 저장하지 않습니다. 새로고침하거나 다른 페이지로 이동하면 사라집니다. 위키 자동 생성 기능은 준비 중입니다.</Notice>
          <div className="actions">
            <button className="button primary" type="submit" disabled>위키 생성하기 (준비 중)</button>
            <ButtonLink href="./?page=wiki">예시 위키 보기</ButtonLink>
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
