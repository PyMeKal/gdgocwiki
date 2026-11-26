import { isSafeUrl } from '../../utils/wikiSchema.js'

export default function WikiImage({ src, alt, caption }) {
  // 렌더링 경계에서도 주소를 검사해 잘못된 src가 DOM에 전달되지 않게 합니다.
  if (!isSafeUrl(src)) return null
  return (
    <figure className="wiki-image">
      <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
