import { createPage, generatePages, getGeneration, createWiki, getPage, getPages, getWiki, unlockWiki, uploadChat } from './wikis.js'
import { readChatFile } from '../utils/readChatFile.js'
import { redirect } from 'react-router'
import { wikiPath } from '../utils/paths.js'
import { parseWikiData } from '../utils/importWiki.js'

export async function uploadAction({ request }) {
  const form = await request.formData()
  const title = form.get('title')
  const wikiId = form.get('wikiId')
  let wiki = typeof wikiId === 'string' && wikiId ? { id: wikiId } : null
  let chat = typeof form.get('chatId') === 'string' && form.get('chatId') ? { id: form.get('chatId') } : null
  try {
    const name = typeof title === 'string' ? title.trim() : ''
    if (!name || name.length > 100) throw new Error('100자 이내의 위키 제목을 입력해주세요.')
    const file = form.get('chat')
    if (!(file instanceof File)) throw new Error('대화 파일을 선택해주세요.')
    await readChatFile(file)
    wiki ??= await createWiki({ name })
    chat ??= await uploadChat(wiki.id, file)
    const job = await generatePages(wiki.id, { chatIds: [chat.id], mode: 'MERGE' })
    return redirect(`${wikiPath(wiki.id)}/generations/${encodeURIComponent(job.jobId)}`)
  } catch (error) {
    return { wiki, chat, error: error.message }
  }
}

export async function wikiLoader({ params }) {
  const [wiki, { pages }] = await Promise.all([getWiki(params.wikiId), getPages(params.wikiId)])
  return { wiki, pages }
}

export async function pageLoader({ params }) {
  const [wiki, page] = await Promise.all([getWiki(params.wikiId), getPage(params.wikiId, params.pagesId)])
  const { wiki: document } = parseWikiData(page)
  return { wiki, document }
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

export async function generationLoader({ params }) {
  const { wikiId, jobId } = params
  const job = await getGeneration(wikiId, jobId)
  if (!['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(job.status)) throw new Error('생성 작업 상태가 올바르지 않습니다.')
  if (job.status !== 'COMPLETED' || job.pages === undefined) return job
  if (!Array.isArray(job.pages) || !job.pages.length || job.pages.length > 1000) throw new Error('생성된 문서 목록이 올바르지 않습니다.')
  for (const page of job.pages) parseWikiData(page)
  // 작업과 문서 순번으로 저장을 식별해 재조회·재시도에도 중복 문서를 만들지 않습니다.
  for (const [generationIndex, page] of job.pages.entries()) {
    await createPage(wikiId, { ...page, generationJobId: jobId, generationIndex })
  }
  return getGeneration(wikiId, jobId)
}
