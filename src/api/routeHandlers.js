import { generatePages, createWiki, getPage, unlockWiki, updatePage, uploadChat } from './wikis.js'
import { readChatFile } from '../utils/readChatFile.js'
import { redirect } from 'react-router'
import { wikiPagePath, wikiPath } from '../utils/paths.js'
import { getPageSection, parseWikiData } from '../utils/importWiki.js'
import { refreshWiki } from './queries.js'

export async function uploadAction({ request }, client) {
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
    if (password) {
      await unlockWiki(wiki.id, password)
      await refreshWiki(client, wiki.id)
    }
    chat ??= await uploadChat(wiki.id, file)
    const job = await generatePages(wiki.id, { chatIds: [chat.id], mode: 'MERGE' })
    await refreshWiki(client, wiki.id)
    return redirect(`${wikiPath(wiki.id)}/generations/${encodeURIComponent(job.jobId)}`)
  } catch (error) {
    return { wiki, chat, error: error.message }
  }
}

export async function pageEditAction({ request, params }, client) {
  try {
    const form = await request.formData()
    if (form.has('password')) {
      await unlockWiki(params.wikiId, form.get('password'))
      await refreshWiki(client, params.wikiId)
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
    await refreshWiki(client, params.wikiId)
    return redirect(`${wikiPagePath(params.wikiId, params.pagesId)}${sectionId ? `#${encodeURIComponent(sectionId)}` : ''}`)
  } catch (error) {
    return { error: error.message }
  }
}

export async function unlockAction({ request, params }, client) {
  try {
    const form = await request.formData()
    await unlockWiki(params.wikiId, form.get('password'))
    await refreshWiki(client, params.wikiId)
    return null
  } catch (error) {
    return { error: error.message }
  }
}
