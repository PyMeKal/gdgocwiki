import { useState } from 'react'

export default function PasswordInput({ disabled, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-input">
      <input {...props} type={visible ? 'text' : 'password'} disabled={disabled} />
      <button type="button" className="password-toggle" disabled={disabled}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'} aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  )
}
