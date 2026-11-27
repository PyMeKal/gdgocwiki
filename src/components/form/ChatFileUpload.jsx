import { useId, useRef, useState } from 'react'
import { readChatFile } from '../../utils/readChatFile.js'

export default function ChatFileUpload({ value, onChange, disabled = false }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const request = useRef(0)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')

  async function loadFiles(files) {
    if (disabled || !files.length) return
    const currentRequest = ++request.current
    setError('')
    setIsReading(true)
    onChange(null)

    try {
      if (files.length !== 1) throw new Error('대화 파일은 한 번에 하나만 올려주세요.')
      const chat = await readChatFile(files[0])
      if (currentRequest === request.current) onChange(chat)
    } catch (error) {
      if (currentRequest === request.current) {
        setError(error.message)
        if (inputRef.current) inputRef.current.value = ''
      }
    } finally {
      if (currentRequest === request.current) setIsReading(false)
    }
  }

  function removeFile() {
    if (disabled) return
    request.current += 1
    inputRef.current.value = ''
    setError('')
    setIsReading(false)
    onChange(null)
  }

  return (
    <div className="field chat-upload">
      <label className="upload-label" htmlFor={inputId}>파일 업로드</label>
      <div
        className="upload-area"
        aria-busy={isReading}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          if (disabled) return
          inputRef.current.value = ''
          loadFiles(event.dataTransfer.files)
        }}
      >
        <img className="upload-icon" src="/design/upload.svg" alt="" /><label className="choose-export" htmlFor={inputId}>대화 파일 선택</label><p className="muted small">카카오톡 대화 파일을 선택하거나 끌어다 놓으세요.</p>
        <input
          className="sr-only"
          ref={inputRef}
          id={inputId}
          name="chat"
          type="file"
          disabled={disabled}
          accept="../.txt,text/plain"
          aria-describedby={`${inputId}-help${error ? ` ${inputId}-error` : ''}`}
          aria-invalid={Boolean(error)}
          onChange={(event) => loadFiles(event.target.files)}
        />
        <p id={`${inputId}-help`} className="file-help muted small">지원 형식: .txt · 한 번에 한 파일 · 5MB 초과 시 최근 대화만 5MB 이하로 남깁니다.</p>
        <p className="upload-status small" role="status">
          {isReading ? '대화 파일을 읽고 크기를 확인하는 중입니다…' : value?.originalSize ? `5MB 이하의 업로드 파일을 준비했습니다. ${(value.originalSize / 1024 / 1024).toFixed(2)}MB → ${(value.file.size / 1024 / 1024).toFixed(2)}MB (${value.file.size.toLocaleString()}바이트). 원본 파일은 유지됩니다.` : value ? '대화 파일을 불러왔습니다.' : ''}
        </p>
        {value && <p className="uploaded-file"><img src="/design/file.svg" alt="" />{value.file.name} · {Math.ceil(value.file.size / 1024).toLocaleString()}KB<img src="/design/check.svg" alt="" /></p>}
        {(value || isReading) && <button className="button" type="button" disabled={disabled} onClick={removeFile}>파일 삭제</button>}
        {error && <p id={`${inputId}-error`} className="upload-error small" role="alert">{error}</p>}
      </div>
    </div>
  )
}
