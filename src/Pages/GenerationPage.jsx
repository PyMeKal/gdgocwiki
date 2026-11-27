import Skeleton from 'react-loading-skeleton'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { generationQuery } from '../api/queries.js'
import WikiApiError from '../components/common/WikiApiError.jsx'
import { useParams } from 'react-router'
import CopyWikiUrlButton from '../components/common/CopyWikiUrlButton.jsx'
import ButtonLink from '../components/common/ButtonLink.jsx'
import { wikiPath } from '../utils/paths.js'

export default function GenerationPage() {
  const { wikiId, jobId } = useParams()
  const client = useQueryClient()
  const result = useQuery(generationQuery(wikiId, jobId, client))
  const { data: upload } = useQuery({
    queryKey: ['wiki', wikiId, 'generations', jobId, 'upload'],
    queryFn: skipToken,
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
        <p className="eyebrow">대화 속 지식이 모이고 있어요</p>
        <h1>{failed ? '문서를 만들지 못했습니다.' : completed ? '다 제작되었습니다!' : <>우리의 대화가<br />위키로 만들어지고 있어요.</>}</h1>
        <p className="intro">{failed ? '문서 생성에 실패했습니다. 홈으로 돌아가 다시 시작해주세요.' : completed ? '함께 나눈 대화가 하나의 지식으로 연결되었어요.' : <>대화 속 메시지를 분석하고<br />오래 간직할 지식으로 정리하고 있어요.</>}</p>
      </div>

      <section className={`panel generation-progress${failed ? ' is-failed' : ''}${completed ? ' is-completed' : ''}`} aria-labelledby="generation-stage">
        <img src="/design/brand.svg" alt="" />
        {/* shortcut: 세부 진행률 API 연동 전까지 고정된 채움으로 표시합니다. */}
        <div className="generation-chart" aria-hidden="true">
          {completed ? <img src="/design/generationCheck.svg" alt="" /> : failed ? <span>!</span> : null}
        </div>
        <div className="generation-stage" role="status" aria-busy={loading}>
          <h2 id="generation-stage">{loading ? <Skeleton width={210} /> : failed ? '위키 제작이 중단되었습니다' : completed ? '위키가 완성되었어요!' : processing ? '대화 속 중요한 내용을 찾고 있어요…' : '위키 제작을 준비하고 있어요…'}</h2>
          <p>{loading ? <Skeleton count={2} /> : failed ? '생성된 문서가 없습니다.' : completed ? `문서 ${job.createdPages + job.updatedPages}개를 저장했습니다.` : <>잠시 시간이 걸릴 수 있어요.<br />완료될 때까지 이 페이지를 열어두세요.</>}</p>
          {pending && <span className="sr-only">위키를 만들고 있습니다.</span>}
        </div>

        {!failed && <><div className="generation-upload">
          <img src="/design/file.svg" alt="" />
          <div><p>{upload?.fileName ?? '대화 업로드 완료'}</p><small>업로드 완료</small></div>
          <img src="/design/generationCheck.svg" alt="" />
        </div>
        <ol className="generation-steps" aria-label="위키 제작 단계">
          <li className="is-done">
            <span className="generation-step-icon"><img src="/design/generationCheck.svg" alt="완료" /></span>
            <div><h3>대화 업로드 완료</h3><p>대화 분석 준비가 끝났어요.</p></div>
          </li>
          <li className={completed ? 'is-done' : processing ? 'is-current' : ''} aria-current={processing ? 'step' : undefined}>
            <span className="generation-step-icon">{completed ? <img src="/design/generationCheck.svg" alt="완료" /> : '02'}</span>
            <div><h3>주제 연결하기</h3><p>아이디어와 인물, 공유된 링크를 찾고 있어요.</p></div>
          </li>
          <li className={completed ? 'is-done' : ''}>
            <span className="generation-step-icon">{completed ? <img src="/design/generationCheck.svg" alt="완료" /> : '03'}</span>
            <div><h3>위키 만들기</h3><p>대화 속 내용을 문서로 정리해요.</p></div>
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
