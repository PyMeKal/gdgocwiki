export function logApiResult({ method, path, status, success }) {
  const log = success ? console.info : console.error
  log(`[API ${success ? '성공' : '실패'}] ${method} ${path} (${status ?? '응답 없음'})`)
}
