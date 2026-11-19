export function filterPages(pages, query, sort, category = '') {
  const search = query.trim().toLocaleLowerCase()
  return pages.filter((page) => (!category || page.category === category) && `${page.title} ${page.category ?? ''}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'ko')
      const first = Date.parse(a.updatedAt) || 0
      const second = Date.parse(b.updatedAt) || 0
      return sort === 'oldest' ? first - second : second - first
    })
}
