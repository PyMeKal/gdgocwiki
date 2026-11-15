import { createPage, generatePages, getGeneration, createWiki, getPage, getPages, getWiki, unlockWiki, updatePage, uploadChat } from './wikis.js'
import { readChatFile } from '../utils/readChatFile.js'
import { redirect } from 'react-router'
import { wikiPagePath, wikiPath } from '../utils/paths.js'
import { getPageSection, parseWikiData } from '../utils/importWiki.js'

export async function uploadAction({ request }) {
  const form = await request.formData()
  const title = form.get('title')
  const password = form.get('password') ?? ''
  const wikiId = form.get('wikiId')
  let wiki = typeof wikiId === 'string' && wikiId ? { id: wikiId } : null
  let chat = typeof form.get('chatId') === 'string' && form.get('chatId') ? { id: form.get('chatId') } : null
  try {
    const name = typeof title === 'string' ? title.trim() : ''
    if (!name || name.length > 100) throw new Error('100자 이내의 위키 제목을 입력해주세요.')
    if (typeof password !== 'string') throw new Error('비밀번호를 문자열로 입력해주세요.')
    const file = form.get('chat')
    if (!(file instanceof File)) throw new Error('대화 파일을 선택해주세요.')
    await readChatFile(file)
    wiki ??= await createWiki({ name, password })
    if (password) await unlockWiki(wiki.id, password)
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
  return { wiki, document, page }
}

export async function pageEditLoader({ params, request }) {
  const data = await pageLoader({ params })
  if (!Number.isInteger(data.page.version) || data.page.version <= 0) throw new Error('문서 버전을 불러오지 못했습니다. 다시 시도해주세요.')
  const sectionId = new URL(request.url).searchParams.get('section')
  const editContent = sectionId === null ? data.page.content : getPageSection(data.page.content, sectionId).content
  return { ...data, editContent }
}

export async function pageEditAction({ request, params }) {
  try {
    const form = await request.formData()
    if (form.has('password')) {
      await unlockWiki(params.wikiId, form.get('password'))
      return null
    }
    let content = form.get('content')
    const version = Number(form.get('version'))
    if (typeof content !== 'string' || !Number.isInteger(version) || version <= 0) throw new Error('문서 본문과 버전을 확인해주세요.')
    const page = await getPage(params.wikiId, params.pagesId)
    if (version !== page.version) throw new Error('다른 사용자가 수정한 문서입니다. 입력한 내용을 복사한 뒤 문서를 다시 불러와주세요.')
    const sectionId = new URL(request.url).searchParams.get('section')
    if (sectionId !== null) {
      const section = getPageSection(page.content, sectionId)
      const { wiki } = parseWikiData({ ...page, content })
      if (wiki.description || wiki.sections.length !== 1) throw new Error('선택한 섹션의 ## 제목 하나와 본문만 입력해주세요.')
      if (section.end < page.content.length && !/[\r\n]$/.test(content)) content += '\n'
      content = page.content.slice(0, section.start) + content + page.content.slice(section.end)
    }
    parseWikiData({ ...page, content })
    await updatePage(params.wikiId, params.pagesId, { content, version })
    return redirect(`${wikiPagePath(params.wikiId, params.pagesId)}${sectionId ? `#${encodeURIComponent(sectionId)}` : ''}`)
  } catch (error) {
    return { error: error.message }
  }
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
