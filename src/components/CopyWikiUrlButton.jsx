import { useState } from 'react'
import { copyWikiUrl } from '../utils/copyWikiUrl.js'

export default function CopyWikiUrlButton({ wikiId, iconOnly = false }) {
  const [result, setResult] = useState(null)
  return (
    <span className="wiki-share">
      <button className={`button${iconOnly ? ' share-icon-button' : ''}`} type="button" aria-label="위키 URL 복사" title="위키 URL 복사"
        onClick={async () => setResult(await copyWikiUrl(wikiId))}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
        </svg>
        {!iconOnly && '위키 URL 복사'}
      </button>
      {result && <span className="wiki-share-status" role="status">
        {result.copied ? '위키 URL을 복사했습니다.' : '복사하지 못했습니다. 아래 주소를 직접 복사해주세요.'}
        {!result.copied && <input aria-label="복사할 위키 URL" type="text" readOnly value={result.url} onFocus={(event) => event.target.select()} />}
      </span>}
    </span>
  )
}
