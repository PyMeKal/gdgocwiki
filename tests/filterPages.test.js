import assert from 'node:assert/strict'
import test from 'node:test'
import { filterPages } from '../src/utils/filterPages.js'

test('wiki search and sorting preserve source data and handle missing dates', () => {
  const pages = [{ id: 1, title: 'Beta', category: 'EVENT', updatedAt: '2026-11-10' }, { id: 2, title: 'Alpha', updatedAt: '2026-11-15' }, { id: 3, title: 'Gamma' }]
  assert.deepEqual(filterPages(pages, '  event ', 'newest').map(p => p.id), [1])
  assert.deepEqual(filterPages(pages, 'ALPHA', 'title').map(p => p.id), [2])
  assert.deepEqual(filterPages(pages, '', 'newest').map(p => p.id), [2, 1, 3])
  assert.deepEqual(filterPages(pages, '', 'oldest').map(p => p.id), [3, 1, 2])
  assert.deepEqual(filterPages(pages, '', 'title').map(p => p.id), [2, 1, 3])
  assert.deepEqual(filterPages(pages, 'missing', 'newest'), [])
  assert.deepEqual(pages.map(p => p.id), [1, 2, 3])
})

test('category filtering combines exact matches with search and sorting without mutating pages', () => {
  const pages = [
    { id: 1, title: 'Beta', category: 'EVENT', updatedAt: '2026-11-10' },
    { id: 2, title: 'Alpha', category: 'EVENT', updatedAt: '2026-11-15' },
    { id: 3, title: 'EVENT participant', category: 'PERSON' },
    { id: 4, title: 'Uncategorized' },
  ]
  const original = structuredClone(pages)
  assert.deepEqual(filterPages(pages, '', 'newest', 'EVENT').map(p => p.id), [2, 1])
  assert.deepEqual(filterPages(pages, '', 'oldest', 'EVENT').map(p => p.id), [1, 2])
  assert.deepEqual(filterPages(pages, '', 'title', 'EVENT').map(p => p.id), [2, 1])
  assert.deepEqual(filterPages(pages, ' beta ', 'title', 'EVENT').map(p => p.id), [1])
  assert.deepEqual(filterPages(pages, 'participant', 'title', 'EVENT'), [])
  assert.deepEqual(filterPages(pages, '', 'title', 'MISSING'), [])
  assert.equal(filterPages(pages, '', 'title', '').length, 4)
  assert.deepEqual(filterPages([], '', 'newest', 'EVENT'), [])
  assert.deepEqual(pages, original)
})
