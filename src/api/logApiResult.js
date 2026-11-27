export function logApiResult({ method, path, status, success }) {
  if (!import.meta.env?.DEV) return
  const log = success ? console.info : console.error
  log(`[API ${success ? '성공' : '실패'}] ${method} ${path} (${status ?? '응답 없음'})`)
}
