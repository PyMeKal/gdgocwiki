import * as z from 'zod/mini'

// CSP의 eval 제한에 맞춰 Zod의 동적 함수 생성을 비활성화합니다.
z.config({ jitless: true })

const id = z.string().check(z.refine((value) => value.trim().length > 0))
const title = z.string().check(z.maxLength(100), z.refine((value) => value.trim().length > 0))
const date = z.nullish(z.string().check(z.refine((value) => Number.isFinite(Date.parse(value)))))
const count = z.int().check(z.nonnegative())
const status = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])

export const wikiSchema = z.looseObject({
  id,
  name: title,
  hasPassword: z.optional(z.boolean()),
  createdAt: date,
  updatedAt: date,
})

const pageSummarySchema = z.looseObject({
  id,
  title,
  category: z.nullish(z.string()),
  updatedAt: date,
})

export const pagesSchema = z.looseObject({ pages: z.array(pageSummarySchema) })

export const generationCreatedSchema = z.looseObject({
  jobId: id,
  status: z.optional(status),
})

export const generationSchema = z.looseObject({
  status,
  jobId: z.optional(id),
  createdPages: z.optional(count),
  updatedPages: z.optional(count),
  pages: z.optional(z.array(pageSummarySchema)),
}).check(z.refine((job) => job.status !== 'COMPLETED' || (
  job.createdPages !== undefined && job.updatedPages !== undefined
)))
