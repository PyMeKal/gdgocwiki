import { useState } from 'react'
import { copyWikiUrl } from '../utils/copyWikiUrl.js'

export default function CopyWikiUrlButton({ wikiId, iconOnly = false }) {
  const [result, setResult] = useState(null)
  return (
    <span className="wiki-share">
      <button className={`button${iconOnly ? ' share-icon-button' : ''}`} type="button" aria-label="위키 URL 복사" title="위키 URL 복사"
        onClick={async () => setResult(await copyWikiUrl(wikiId))}>
        <img src="/design/share.svg" alt="" />
        {!iconOnly && '위키 URL 복사'}
      </button>
      {result && <span className="wiki-share-status" role="status">
        {result.copied ? '위키 URL을 복사했습니다.' : '복사하지 못했습니다. 아래 주소를 직접 복사해주세요.'}
        {!result.copied && <input aria-label="복사할 위키 URL" type="text" readOnly value={result.url} onFocus={(event) => event.target.select()} />}
      </span>}
    </span>
  )
}
