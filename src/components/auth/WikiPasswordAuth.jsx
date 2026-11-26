import { useState } from 'react'
import { Form } from 'react-router'

export default function WikiPasswordAuth({ wikiName, busy, error }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  return (
    <main id="main" className="container wiki-auth-page" aria-busy={busy}>
      <title>위키 비밀번호 인증 · 대화위키</title>
      <header className="wiki-auth-intro">
        <div className="wiki-auth-lock"><img src="/design/auth-lock.svg" alt="" /></div>
        <p className="wiki-auth-eyebrow">비공개 위키</p>
        <h1>우리만의 이야기,<br />비밀번호로 열어봐요.</h1>
        <p>이 위키를 보기 위해 비밀번호를 입력해주세요.</p>
      </header>
      <Form method="post" className="wiki-auth-card">
        <div className="wiki-auth-summary">
          <img src="/design/brand.svg" alt="" />
          <div><h2>{wikiName || '비공개 위키'}</h2><p>비밀번호 인증 후 내용을 볼 수 있어요.</p></div>
        </div>
        <div className="wiki-auth-field">
          <label htmlFor="wiki-password">비밀번호</label>
          <div className="wiki-auth-input">
            <input id="wiki-password" name="password" type={passwordVisible ? 'text' : 'password'} aria-label="위키 비밀번호" autoComplete="current-password" placeholder="비밀번호를 입력해주세요" required disabled={busy} aria-describedby={`wiki-password-help${error ? ' wiki-password-error' : ''}`} aria-invalid={Boolean(error)} />
            <button type="button" disabled={busy} aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={passwordVisible} aria-controls="wiki-password" onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? '숨기기' : '보기'}</button>
          </div>
          <p id="wiki-password-help">영문 대소문자를 구분해서 입력해주세요.</p>
          {error && <p id="wiki-password-error" role="alert" className="upload-error">{error}</p>}
        </div>
        <button className="button primary wiki-auth-submit" type="submit" disabled={busy}>{busy ? '확인 중…' : '위키 열기'}</button>
      </Form>
      <div className="wiki-auth-help"><p><strong>비밀번호를 모르시나요?</strong></p><p>위키를 공유한 분께 비밀번호를 요청해주세요.</p></div>
    </main>
  )
}
