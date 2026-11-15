import { wikiPath } from './paths.js'

export async function copyWikiUrl(wikiId) {
  const url = new URL(wikiPath(wikiId), window.location.origin).href
  try {
    await navigator.clipboard.writeText(url)
    return { url, copied: true }
  } catch {
    return { url, copied: false }
  }
}
