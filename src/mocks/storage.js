// shortcut: 같은 origin의 브라우저에 가상 백엔드를 보관합니다. 기기 간 공유는 실제 서버로 교체합니다.
export function openMockStorage() {
  let database
  const open = () => database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('conversation-wiki:mock-api', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('database')
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('다른 탭에서 가상 DB를 사용 중입니다. 탭을 닫고 다시 시도해주세요.'))
  })

  async function transaction(mode, value) {
    const connection = await open()
    return new Promise((resolve, reject) => {
      const tx = connection.transaction('database', mode)
      const store = tx.objectStore('database')
      const request = mode === 'readonly' ? store.get('snapshot') : store.put(value, 'snapshot')
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = () => reject(tx.error ?? new Error('가상 DB 트랜잭션이 취소되었습니다.'))
      tx.onerror = () => reject(tx.error)
    })
  }

  return {
    read: () => transaction('readonly'),
    write: (value) => transaction('readwrite', value),
    // 탭별 메모리 복사본이 서로의 변경을 덮어쓰지 않도록 요청 전체를 잠급니다.
    run: (operation) => navigator.locks.request('conversation-wiki:mock-api', operation),
  }
}
