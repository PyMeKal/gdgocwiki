import Skeleton from 'react-loading-skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generationQuery } from '../api/queries.js'
import WikiApiError from '../components/WikiApiError.jsx'
import { useParams } from 'react-router'
import CopyWikiUrlButton from '../components/CopyWikiUrlButton.jsx'
import ButtonLink from '../components/ButtonLink.jsx'
import { wikiPath } from '../utils/paths.js'

export default function GenerationPage() {
  const { wikiId, jobId } = useParams()
  const client = useQueryClient()
  const result = useQuery(generationQuery(wikiId, jobId, client))
  const { data: upload } = useQuery({
    queryKey: ['wiki', wikiId, 'generations', jobId, 'upload'],
    enabled: false,
  })
  const job = result.data
  const loading = result.isPending
  const completed = job?.status === 'COMPLETED'
  const failed = job?.status === 'FAILED'
  const processing = job?.status === 'PROCESSING'
  const pending = loading || ['PENDING', 'PROCESSING'].includes(job?.status)
  if (result.error) return <WikiApiError error={result.error} onRetry={() => result.refetch()} />

  return (
    <main id="main" className="container generation-page">
      <title>위키 제작 · WikiTalk</title>
      <div className="generation-intro">
        <p className="eyebrow">GOOD THINGS ARE COMING TOGETHER</p>
        <h1>{failed ? '문서를 만들지 못했습니다.' : completed ? '다 제작되었습니다!' : <>Your chats.<br />A wiki in the making.</>}</h1>
        <p className="intro">{failed ? '문서 생성에 실패했습니다. 홈으로 돌아가 다시 시작해주세요.' : completed ? 'Your conversation, connected and ready to explore.' : <>We’re analyzing the messages in your conversation<br />and turning them into something worth keeping.</>}</p>
      </div>

      <section className={`panel generation-progress${failed ? ' is-failed' : ''}${completed ? ' is-completed' : ''}`} aria-labelledby="generation-stage">
        <img src="/design/brand.svg" alt="" />
        {/* shortcut: 세부 진행률 API 연동 전까지 고정된 채움으로 표시합니다. */}
        <div className="generation-chart" aria-hidden="true">
          {completed ? <img src="/design/generationCheck.svg" alt="" /> : failed ? <span>!</span> : null}
        </div>
        <div className="generation-stage" role="status" aria-busy={loading}>
          <h2 id="generation-stage">{loading ? <Skeleton width={210} /> : failed ? '위키 제작이 중단되었습니다' : completed ? 'Your wiki is ready!' : processing ? 'Finding the good stuff…' : 'Getting things ready…'}</h2>
          <p>{loading ? <Skeleton count={2} /> : failed ? '생성된 문서가 없습니다.' : completed ? `문서 ${job.createdPages + job.updatedPages}개를 저장했습니다.` : <>This may take a few moments.<br />Keep this page open while we work.</>}</p>
          {pending && <span className="sr-only">위키를 만들고 있습니다.</span>}
        </div>

        {!failed && <><div className="generation-upload">
          <img src="/design/file.svg" alt="" />
          <div><p>{upload?.fileName ?? 'Conversation uploaded'}</p><small>Upload complete</small></div>
          <img src="/design/generationCheck.svg" alt="" />
        </div>
        <ol className="generation-steps" aria-label="위키 제작 단계">
          <li className="is-done">
            <span className="generation-step-icon"><img src="/design/generationCheck.svg" alt="완료" /></span>
            <div><h3>Conversation uploaded</h3><p>Your chat is ready to go.</p></div>
          </li>
          <li className={completed ? 'is-done' : processing ? 'is-current' : ''} aria-current={processing ? 'step' : undefined}>
            <span className="generation-step-icon">{completed ? <img src="/design/generationCheck.svg" alt="완료" /> : '02'}</span>
            <div><h3>Connecting topics</h3><p>Finding ideas, people, and shared links.</p></div>
          </li>
          <li className={completed ? 'is-done' : ''}>
            <span className="generation-step-icon">{completed ? <img src="/design/generationCheck.svg" alt="완료" /> : '03'}</span>
            <div><h3>Building your wiki</h3><p>Organizing everything into articles.</p></div>
          </li>
        </ol></>}
        {(completed || failed) && <div className="actions">
          {completed ? <><ButtonLink to={wikiPath(wikiId)} primary>위키로 이동</ButtonLink><CopyWikiUrlButton wikiId={wikiId} /></> : <ButtonLink to="/" primary>홈으로 이동</ButtonLink>}
        </div>}
      </section>
      {!failed && <p className="privacy-note generation-note"><img src="/design/lock.svg" alt="" />공유 전 대화에 포함된 개인정보를 확인해주세요.</p>}
    </main>
  )
}
