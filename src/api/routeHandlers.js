import { createWiki, getPage, getPages, getWiki, unlockWiki, uploadChat } from './wikis.js'
import { readChatFile } from '../utils/readChatFile.js'

export async function uploadAction({ request }) {
  const form = await request.formData()
  const title = form.get('title')
  const wikiId = form.get('wikiId')
  let wiki = typeof wikiId === 'string' && wikiId ? { id: wikiId } : null
  try {
    const name = typeof title === 'string' ? title.trim() : ''
    if (!name || name.length > 100) throw new Error('100자 이내의 위키 제목을 입력해주세요.')
    const file = form.get('chat')
    if (!(file instanceof File)) throw new Error('대화 파일을 선택해주세요.')
    await readChatFile(file)
    wiki ??= await createWiki({ name })
    const chat = await uploadChat(wiki.id, file)
    return { wiki, chat }
  } catch (error) {
    return { wiki, error: error.message }
  }
}

export async function wikiLoader({ params }) {
  const [wiki, { pages }] = await Promise.all([getWiki(params.wikiId), getPages(params.wikiId)])
  return { wiki, pages }
}

export async function pageLoader({ params }) {
  const [wiki, page] = await Promise.all([getWiki(params.wikiId), getPage(params.wikiId, params.pagesId)])
  return { wiki, page }
}

export async function unlockAction({ request, params }) {
  try {
    const form = await request.formData()
    await unlockWiki(params.wikiId, form.get('password'))
    return null
  } catch (error) {
    return { error: error.message }
  }
}
