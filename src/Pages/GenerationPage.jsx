import Skeleton from 'react-loading-skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generationQuery } from '../api/queries.js'
import WikiApiError from '../components/common/WikiApiError.jsx'
import { useParams } from 'react-router'
import CopyWikiUrlButton from '../components/common/CopyWikiUrlButton.jsx'
import Breadcrumb from '../components/common/Breadcrumb.jsx'
import ButtonLink from '../components/common/ButtonLink.jsx'
import { wikiPath } from '../utils/paths.js'

export default function GenerationPage() {
  const { wikiId, jobId } = useParams()
  const client = useQueryClient()
  const result = useQuery(generationQuery(wikiId, jobId, client))
  const job = result.data
  const loading = result.isPending
  const pending = !loading && ['PENDING', 'PROCESSING'].includes(job?.status)
  if (result.error) return <WikiApiError error={result.error} onRetry={() => result.refetch()} />

  return (
    <main id="main" className="container form-page" aria-busy={loading}>
      <title>위키 제작 · 대화위키</title>
      <Breadcrumb>위키 제작</Breadcrumb>
      <section className="panel" aria-busy={loading || pending}>
        <h1>{loading ? <Skeleton width="65%" /> : job.status === 'COMPLETED' ? '다 제작되었습니다!' : job.status === 'FAILED' ? '문서를 만들지 못했습니다.' : '위키를 만들고 있습니다…'}</h1>
        <p role="status">{loading ? <Skeleton count={2} /> : job.status === 'PENDING' ? '대화를 접수했습니다. 변환을 준비하고 있습니다.' : job.status === 'PROCESSING' ? '대화를 JSON으로 변환하고 문서를 준비하고 있습니다. 잠시 기다려주세요.' : job.status === 'COMPLETED' ? `문서 ${job.createdPages + job.updatedPages}개를 저장했습니다.` : '대화 파일을 확인한 뒤 다시 제출해주세요.'}</p>
        <div className="actions">
          {job?.status === 'COMPLETED' && <><ButtonLink to={wikiPath(wikiId)} primary>위키로 이동</ButtonLink><CopyWikiUrlButton wikiId={wikiId} /></>}
          {job?.status === 'FAILED' && <ButtonLink to="/form">대화 다시 올리기</ButtonLink>}
        </div>
      </section>
    </main>
  )
}
