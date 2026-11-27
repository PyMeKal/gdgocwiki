import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { test } from 'node:test'

test('all routes restrict scripts to the same origin without inline or eval exceptions', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const headers = config.headers.find((rule) => rule.source === '/(.*)').headers
  const policy = headers.find(({ key }) => key === 'Content-Security-Policy').value
  const directives = Object.fromEntries(policy.split(';').map((entry) => {
    const [name, ...values] = entry.trim().split(/\s+/)
    return [name, values]
  }))
  assert.deepEqual(directives['script-src'], ["'self'"])
  assert.deepEqual(directives['script-src-attr'], ["'none'"])
  assert.deepEqual(directives['object-src'], ["'none'"])
  assert.deepEqual(directives['base-uri'], ["'self'"])
  assert.deepEqual(directives['frame-ancestors'], ["'none'"])
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/)
})

test('response validation runs without attempting dynamic code generation', () => {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    let attempts = 0
    globalThis.Function = new Proxy(Function, {
      construct() { attempts++; throw new Error('Blocked by CSP') },
      apply() { attempts++; throw new Error('Blocked by CSP') },
    })
    const { wikiSchema, generationSchema } = await import(${JSON.stringify(new URL('../src/api/responseSchemas.js', import.meta.url).href)})
    assert.equal(wikiSchema.safeParse({ id: 'wiki', name: '위키' }).success, true)
    assert.equal(generationSchema.safeParse({ status: 'COMPLETED', createdPages: -1, updatedPages: 0 }).success, false)
    assert.equal(attempts, 0)
  `])
})
