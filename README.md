# 대화위키

카카오톡 대화를 API로 업로드하고, URL의 위키·문서 ID로 API 데이터를 조회하는 React 서비스입니다. JSON 문서의 브라우저 저장·편집도 지원합니다.

## 구조

- `src/components/`: 헤더, 푸터, 공통 레이아웃, 경로 안내, 버튼 링크, 안내문, 태그, 위키 섹션
- `src/components/ChatFileUpload.jsx`: `.txt` 파일 선택·드래그 앤 드롭, 읽기 상태·오류 안내, 파일 삭제
- `src/utils/readChatFile.js`: 파일 크기·확장자·내용 검사와 텍스트 읽기
- `src/Pages/HomePage.jsx`: 서비스 소개와 페이지 이동
- `src/Pages/FormPage.jsx`: 위키 제목 입력, 카카오톡 `.txt` 미리보기와 POST 업로드
- `src/Pages/WikiHomePage.jsx`, `src/Pages/WikiPage.jsx`: URL의 ID로 위키·문서 목록·문서 본문을 GET하여 표시
- `src/Pages/LocalWikiPage.jsx`: 브라우저에 저장된 JSON 문서 미리보기
- `src/api/routeHandlers.js`, `src/components/WikiApiError.jsx`: 업로드 action, 조회 loader, 비밀번호 인증과 오류·재시도
- `src/Pages/WikiEditPage.jsx`: 제목·소개·목차·본문·표·목록·주석 편집, 목차 추가·삭제·순서 변경
- `src/Pages/WikiImportPage.jsx`: JSON 파일·직접 입력, 검증 결과, 공통 문서 미리보기와 저장
- `src/components/WikiDocument.jsx`: 제목, 계층형 목차·본문, Infobox, 주석·참고 자료를 조립하는 공통 렌더러
- `src/components/WikiInfobox.jsx`, `src/components/WikiImage.jsx`: 주요 정보 표와 이미지
- `src/components/Footnote.jsx`: 본문 주석 번호 링크와 마우스·키보드 포커스 툴팁, 스크린 리더용 주석 연결
- `src/components/WikiContent.jsx`: 본문·표·목록 및 주석 표시
- `src/data/wiki.js`, `src/utils/wiki.js`: 기본 위키 데이터, 데이터 검사·브라우저 저장·주석 처리
- `src/utils/wikiSchema.js`: 내부 데이터 검증과 URL 허용 정책
- `src/utils/importWiki.js`: API·JSON의 title/category/content 검사와 ## 제목 기반 WikiDocument 변환
- `public/examples/wiki.json`: API와 같은 title/category/content 입력 예시
- `src/routes.jsx`: React Router 경로와 페이지 연결
- `src/App.jsx`: 공통 레이아웃, 하위 페이지와 스크롤 복원
- `src/index.css`: 공통 스타일과 모바일 화면 대응
- `index.html`: React 앱을 실행하는 단일 진입점

## 실행

```sh
npm install
npm run dev
```

React Router의 `Link`·`NavLink`로 전체 새로고침 없이 이동하며 뒤로·앞으로 가기를 지원합니다.

| 화면 | 주소 |
| --- | --- |
| 홈 | `/` |
| 대화 올리기 | `/form` |
| 위키 홈·문서 목록 | `/wiki/:wikiId` |
| 위키 문서 | `/wiki/:wikiId/pages/:pagesId` |
| 문서 편집 | `/wiki/:wikiId/pages/:pagesId/edit` |
| 섹션 편집 | `/wiki/:wikiId/pages/:pagesId/edit?section=section-1` |
| 브라우저 문서 편집 | `/wiki/:wikiId/preview/edit` |
| 문서 제작 대기·완료 | `/wiki/:wikiId/generations/:jobId` |
| JSON 입력 | `/wiki/:wikiId/import` |
| 브라우저 문서 미리보기 | `/wiki/:wikiId/preview` |

예시 위키 ID는 `550e8400-e29b-41d4-a716-446655440000`, 문서 ID는 `page_001`입니다. 경로는 `src/utils/paths.js`에서 구성하며 문서 조회·편집·돌아가기 링크는 현재 URL의 ID를 유지합니다.
위키 홈은 `GET /wikis/:wikiId`와 `GET /wikis/:wikiId/pages`, 문서 화면은 `GET /wikis/:wikiId`와 `GET /wikis/:wikiId/pages/:pagesId`를 호출합니다. 목록의 문서를 누르면 응답의 문서 ID로 이동합니다. 로딩, 빈 목록, 404·네트워크 오류와 재시도를 표시하며 로컬 예시 데이터로 대체하지 않습니다.
비밀번호가 필요한 위키는 인증 폼을 표시하고 `POST /wikis/:wikiId/unlock` 성공 후 다시 조회합니다. 기본 MSW 예시 위키의 비밀번호는 `1234`입니다.
문서 응답의 `title`, `category`, `content`를 `WikiDocument` 형식으로 변환합니다. `content`에서 줄 처음의 `##개요`·`## 개요`를 섹션 제목으로 읽고, 다음 `##` 전까지의 내용을 해당 섹션의 본문으로 표시합니다. 목차·섹션 번호·링크는 기존 렌더러가 생성합니다.
API 문서 제목 옆 **편집** 버튼은 전체 본문을, 각 섹션 옆 **편집** 버튼은 해당 섹션만 편집합니다. 섹션 제목은 `## 제목` 형식입니다. **편집 완료** 시 `PATCH /wikis/:wikiId/pages/:pageId`에 `{ content, version }`을 전송하고 원래 문서로 돌아갑니다. 저장 실패·버전 충돌 시 입력은 유지됩니다.

JSON 저장·브라우저 문서 편집기는 현재 브라우저의 문서 하나를 사용합니다. 해당 결과는 `/wiki/:wikiId/preview`에서 확인하고, 이 미리보기의 **위키 수정** 버튼으로 브라우저 문서 편집기를 엽니다.
기존 `?page=...` 주소는 사용하지 않습니다.
Vite 개발·preview 서버는 위 주소를 직접 열거나 새로고침할 수 있습니다. 배포 서버에서도 `/wiki/...` 등 파일이 없는 화면 경로를 `index.html`로 보내는 SPA fallback 설정이 필요하며, 정적 파일과 실제 API 경로는 그대로 제공해야 합니다. 자산 경로는 루트(`/`) 기준입니다.
기존 개별 HTML 페이지는 사용하지 않습니다.

```sh
npm run lint
npm test
npm run build
npm run preview
```

배포용 파일은 `dist/`에 생성됩니다. `index.html`을 직접 여는 대신 개발·미리보기 서버를 사용해주세요.

브라우저 문서 미리보기의 **위키 수정** 버튼으로 편집 페이지를 열 수 있습니다. 문서 제목·소개와 모든 목차 제목·본문·목록·표 셀을 수정할 수 있습니다.
본문·목록·표 셀에 `[* 주석 내용]`을 입력하면 문서 전체에서 순서대로 번호가 붙고, 번호에 마우스를 올리거나 키보드로 포커스하면 주석 툴팁이 바로 표시됩니다. 툴팁은 표 안에서도 잘리지 않으며, Escape 키로 닫을 수 있습니다. 번호를 누르면 하단 주석으로, 하단 번호를 누르면 본문으로 이동합니다.
편집 화면에서 이 구문의 내용을 바꾸거나 지우면 주석도 수정·삭제됩니다. 저장 후 **위키로 돌아가기**로 결과를 확인하세요.
저장하지 않고 앱 안에서 이동하면 확인 창을 표시하고, 새로고침·탭 닫기는 브라우저의 이탈 경고를 사용합니다. 저장 실패 시 편집 내용을 유지하고 오류를 표시합니다.
현재 위키 하나를 `localStorage`에 저장하므로 같은 브라우저에서 새로고침해도 수정 사항이 유지됩니다. 기존에 저장한 예시 위키도 그대로 불러올 수 있습니다.
다른 브라우저·기기와 공유되지 않으며 브라우저 사이트 데이터를 지우면 사라집니다.

## JSON으로 위키 생성

1. JSON 입력 화면은 `/wiki/:wikiId/import` 주소로 직접 엽니다. API 테스트를 위해 화면의 **JSON으로 위키 만들기** 버튼·링크는 제거했습니다.
2. 5MB 이하의 `.json` 파일을 선택하거나 JSON을 직접 입력한 뒤 미리보기를 누릅니다.
3. 경고와 미리보기를 확인한 뒤 **현재 위키로 저장**을 누릅니다. 저장 전까지 현재 위키는 바뀌지 않습니다.
4. **생성된 위키 보기**로 이동합니다. 저장은 현재 브라우저의 위키를 교체합니다. 기존 문서를 보관하려면 편집 화면의 **JSON으로 전체 문서 편집**에서 먼저 JSON을 복사해주세요.

제목·본문·정보 항목은 입력 데이터에서만 가져옵니다. 여행 분류나 문서 안내 등 예시 데이터는 가져온 문서에 덧붙이지 않습니다.
문자열은 공백·줄바꿈·HTML 모양의 텍스트를 그대로 보존하며, HTML을 실행하지 않습니다.
목차와 본문은 같은 섹션 트리에서 번호와 링크를 생성합니다.

### JSON 구조

전체 예시는 [public/examples/wiki.json](public/examples/wiki.json)을 참고하세요. API 응답과 파일 입력은 같은 변환 함수를 사용합니다.

```json
{
  "title": "문서 제목",
  "category": "EVENT",
  "content": "##개요\n첫 문단\n\n둘째 문단\n## 일정\n일정 본문"
}
```

| 필드 | 형식과 동작 |
| --- | --- |
| `title` | 필수 문자열, 1~100자. 문서 제목으로 표시합니다. |
| `category` | 선택 문자열. 제공되면 문서 하단에 분류로 표시합니다. |
| `content` | 필수 문자열. `##`로 시작하는 줄을 섹션 제목으로 사용합니다. 빈 문자열도 허용합니다. |

- `##` 뒤 공백 유무에 관계없이 제목을 인식합니다. `###` 등 다른 단계의 제목과 문장 중간의 `##`는 본문으로 유지합니다.
- 각 제목 다음부터 다음 `##` 제목 전까지의 문단·목록·줄바꿈을 한 섹션의 텍스트로 보존합니다. 빈 섹션과 마지막 섹션도 유지합니다.
- 첫 제목 앞의 내용은 문서 소개로 표시합니다. 제목이 없는 본문도 생략하지 않습니다.
- 섹션 ID는 순서대로 생성해 제목이 중복되거나 HTML 모양의 문자가 있어도 목차 링크가 충돌하지 않습니다.
- 외부 입력의 `description`, `sections`, `infobox`, `footnotes`, `references`는 현재 사용하지 않습니다. 기존 변환 코드는 `importWiki.js`에 주석 처리해 두었습니다.
- 일반 Markdown의 목록·표·이미지·강조 서식은 변환하지 않고 원문으로 표시합니다. 기존 `[* 직접 주석]` 처리는 유지합니다.

기존 브라우저 문서는 원래 내부 구조로 저장·렌더링합니다. 편집기의 **JSON으로 전체 문서 편집**도 해당 내부 구조를 검증하며, API 형식의 JSON은 **JSON 입력** 화면에서 가져옵니다.

### 오류 처리와 보안

- JSON 문법·최상위 객체·필드 형식 오류는 화면에 안내하며 기존 저장 문서를 유지합니다.
- 파일·JSON 입력과 API 본문은 최대 5MB, 섹션은 최대 1,000개까지 지원합니다. 초과하면 본문을 임의로 잘라 저장하지 않고 오류를 표시합니다.
- React 텍스트 렌더링을 사용하며 제목·분류·본문의 HTML을 실행하지 않습니다.
- 기존 브라우저 문서의 이미지·링크·주석·참고 자료는 기존 URL 허용 정책과 내부 구조 검증을 유지합니다.
- 브라우저 저장 공간·권한 문제로 저장하지 못하면 오류와 입력 내용·미리보기를 유지합니다.

## 대화 업로드

제목과 파일을 입력한 뒤 **위키 만들기**를 누르면 `POST /wikis`로 위키를 만들고, 반환된 ID로 `POST /wikis/:wikiId/chats`를 호출합니다. 파일 선택·드래그만으로는 전송하지 않습니다.
원본 파일을 `FormData`의 `file` 필드로 전송하며, 처리 중 파일 변경·중복 제출을 막습니다. 업로드 후 `POST /wikis/:wikiId/generations`를 호출하고 대기 화면으로 자동 이동합니다. 화면은 1초마다 작업을 조회하고, JSON 변환과 문서 저장이 끝나면 **다 제작되었습니다!** 문구와 **위키로 이동** 버튼을 표시합니다.
실패하면 입력을 유지하고 오류를 표시합니다. 위키 생성 후 파일 업로드만 실패한 경우 같은 ID로 재시도하여 위키를 중복 생성하지 않습니다. 새로고침하면 이 재시도 정보는 사라집니다.
실행 순서는 **위키 생성 → 대화 업로드 → 생성 요청 → 상태 조회 → 페이지 생성**입니다. 업로드와 생성 요청에 wikiId가 필요하므로 `POST /wikis`는 먼저 호출합니다.

실험용 [카톡 대화 파일](public/examples/kakao-chat.txt)을 다운로드해 업로드하세요. 화면에도 다운로드 링크가 있습니다. 예시에는 가상의 여행 대화와 문서 3개가 들어 있습니다.
`src/mocks/convertChat.js`는 `[문서: 제목 | 분류]` 구간을 문서로 나누고 `[이름] [시간]`을 제거해 `{title, category, content}` JSON을 만듭니다. `##` 제목과 메시지는 그대로 보존합니다. 문서 구분이 없는 파일은 대화 기록 문서 하나로 변환합니다. 실제 AI나 일반 카카오톡 대화의 의미 분석은 수행하지 않습니다.

MSW 작업은 요청 후 1초까지 `PENDING`, 약 6초까지 `PROCESSING`, 그 이후 조회에서 변환하여 `COMPLETED`가 됩니다. 조회 응답의 `pages`는 아직 저장 전인 JSON이며, 대기 화면의 loader가 기존 `createPage` 함수로 `POST /wikis/:wikiId/pages`를 호출합니다. 저장이 모두 끝나야 화면에서 완료를 알립니다.
이 실험을 위해 mock 페이지 생성 요청은 `generationJobId`, `generationIndex`를 추가로 받습니다. 서버는 원본 작업과 내용의 일치를 확인하고 같은 작업·순번의 재요청을 재사용하므로 중복 문서를 만들지 않습니다. 실제 서버 연결 시 이 확장 계약을 맞춰야 합니다. 실제 API가 생성 작업에서 문서를 저장하고 `pages`를 반환하지 않는 경우에는 추가 저장 없이 완료를 표시합니다.
생성 요청 실패 시 기존 위키·업로드 ID로 재시도하고, 페이지 저장 실패 시 대기 화면의 **다시 시도**로 이어서 저장합니다. MSW 가상 DB는 IndexedDB에 저장하므로 같은 origin에서 새로고침하거나 새 탭에서 URL을 열어도 작업·업로드·문서를 불러옵니다.
대화 올리기에서 10MB 이하의 `.txt` 파일 하나를 선택하거나 끌어다 놓으면 파일명과 대화의 처음 2,000자를 확인할 수 있습니다.
UTF-8, BOM이 있는 UTF-16, EUC-KR 텍스트를 읽을 수 있습니다. 카카오톡 대화의 구조를 분석하는 기능은 아직 없습니다.
미리보기는 페이지 메모리에서 보관하며 새로고침하거나 페이지를 이동하면 사라집니다. 업로드 버튼을 누르면 선택한 파일을 API로 전송합니다. 개발 모드의 MSW는 실제 서버 전송 없이 처리하고, MSW를 끄면 설정한 실제 API로 전송합니다.

## MSW mock API

[Notion API 명세서](https://app.notion.com/p/API-413135db696280739469c40b0e438e43)의 API 상세·공통 오류 형식을 기준으로 13개 API를 구현했습니다. 서비스 개요는 구현 범위에 포함하지 않았습니다.
대화 업로드와 위키·문서 조회 화면에서 아래 API 호출 함수를 사용합니다. 개발 모드에서는 같은 요청을 MSW가 가로챕니다. 편집·JSON 입력은 브라우저 저장 방식을 유지합니다.

`npm install` 후 `npm run dev`로 실행하면 MSW가 먼저 준비되고 앱이 열립니다. 브라우저 콘솔에서 `[MSW] Mocking enabled.`를 확인할 수 있습니다.
MSW는 개발 모드에서만 실행되며 `npm run build`·`npm run preview`에서는 활성화되지 않습니다.
`.env.example`의 값을 `.env.local`에 복사해 `VITE_ENABLE_MSW=false`로 설정하면 개발 중에도 끌 수 있습니다. 환경 변수를 바꾼 뒤 개발 서버를 다시 시작하세요.
`VITE_API_BASE_URL`은 기본 빈 문자열로 같은 origin의 `/wikis`를 사용하며, 지정하면 호출 모듈과 MSW 모두 해당 주소를 사용합니다. 명세대로 기본 경로에 `/api`를 덧붙이지 않습니다.

- `src/api/wikis.js`: `fetch` 기반 API 호출 함수. 쿠키를 포함하고, JSON을 반환하며 204 응답은 `undefined`를 반환합니다. 실패 시 `Error`의 `status`, `code`, `message`로 오류를 확인합니다.
- `src/mocks/db.js`: 위키·대화·문서·작업의 상태와 요청 단위 복원·저장을 처리합니다. 브라우저에서는 IndexedDB, Node 테스트에서는 기본적으로 메모리를 사용합니다. 비밀번호와 내부 관계 필드는 응답에서 제외합니다. `resetDb()`는 테스트용 메모리 초기화이며 브라우저의 저장된 DB를 삭제하지 않습니다.
- `src/mocks/storage.js`: IndexedDB의 스냅샷 저장과 Web Locks를 이용한 탭 간 요청 직렬화.
- `src/mocks/handlers.js`: 요청 검사, 인증, 업로드, 생성 작업, 문서 CRUD.
- `src/mocks/browser.js`, `public/mockServiceWorker.js`: 브라우저용 MSW 설정과 공식 CLI로 생성한 worker. MSW 업데이트 시 `npx msw init public --save`로 worker도 갱신하세요.
- `tests/api.test.js`: 동일한 핸들러에 HTTP 요청을 보내는 통합 테스트. Node 22.12 이상이 필요합니다.

| Method | 경로 | 호출 함수 |
| --- | --- | --- |
| POST | `/wikis` | `createWiki({ name, password? })` |
| GET | `/wikis/:wikiId` | `getWiki(wikiId)` |
| PATCH | `/wikis/:wikiId` | `updateWiki(wikiId, { name?, password? })` |
| POST | `/wikis/:wikiId/unlock` | `unlockWiki(wikiId, password)` |
| POST | `/wikis/:wikiId/chats` | `uploadChat(wikiId, file)` |
| GET | `/wikis/:wikiId/chats` | `getChats(wikiId)` |
| POST | `/wikis/:wikiId/generations` | `generatePages(wikiId, { chatIds, mode })` |
| GET | `/wikis/:wikiId/generations/:jobId` | `getGeneration(wikiId, jobId)` |
| GET | `/wikis/:wikiId/pages` | `getPages(wikiId)` |
| POST | `/wikis/:wikiId/pages` | `createPage(wikiId, { title, category, content })` |
| GET | `/wikis/:wikiId/pages/:pageId` | `getPage(wikiId, pageId)` |
| PATCH | `/wikis/:wikiId/pages/:pageId` | `updatePage(wikiId, pageId, { content, version })` |
| DELETE | `/wikis/:wikiId/pages/:pageId` | `deletePage(wikiId, pageId)` |

### 브라우저 콘솔에서 확인

개발 서버를 연 브라우저의 개발자 도구 콘솔에서 다음을 실행할 수 있습니다. 화면에서 사용하는 API를 직접 확인할 수 있습니다.

```js
const api = await import('/src/api/wikis.js')
const wikiId = '550e8400-e29b-41d4-a716-446655440000'

await api.unlockWiki(wikiId, '1234')
await api.getWiki(wikiId)
await api.getChats(wikiId) // chat_001
await api.getPages(wikiId) // page_001, page_002, page_003
await api.getPage(wikiId, 'page_001')

const created = await api.createWiki({ name: '테스트 위키' })
const page = await api.createPage(created.id, {
  title: '테스트 문서', category: 'EVENT', content: '## 개요\n테스트 본문',
})
await api.updatePage(created.id, page.id, { content: '수정 본문', version: 1 })
await api.getPage(created.id, page.id) // version: 2
await api.deletePage(created.id, page.id)

const chat = await api.uploadChat(created.id, new File(['첫 메시지\n두 번째 메시지'], 'chat.txt'))
const job = await api.generatePages(created.id, { chatIds: [chat.id], mode: 'MERGE' })
await api.getGeneration(created.id, job.jobId) // PENDING (약 6초 뒤 조회하면 COMPLETED와 pages 반환)
// 대기 화면으로 이동하면 상태 조회와 페이지 POST 저장을 자동으로 진행합니다.
// /wiki/{created.id}/generations/{job.jobId} 경로로 이동하세요.
```

직접 `fetch('/wikis/...')`로도 요청할 수 있습니다. JSON 요청에는 `Content-Type: application/json`과 `JSON.stringify(body)`를 사용하고, 업로드는 `FormData`의 `file` 필드를 사용하세요. `FormData`의 Content-Type은 브라우저가 boundary와 함께 설정하도록 두세요.
외부 API 주소를 사용하는 경우 쿠키 요청에는 `credentials: 'include'`가 필요합니다.

### mock 동작과 명세의 미정 항목

- 가상 DB는 `conversation-wiki:mock-api` IndexedDB에 저장됩니다. 매 요청마다 최신 스냅샷을 읽고 성공 응답 전에 저장하며, 저장 실패 시 500과 오류 안내를 반환하고 변경을 되돌립니다. Web Locks로 여러 탭의 덮어쓰기를 막습니다. 기존 화면의 `localStorage` 문서에는 영향을 주지 않습니다.
- 위키·페이지·업로드·작업과 개발용 인증 상태는 동일 브라우저·동일 origin에서 유지됩니다. `localhost`와 `127.0.0.1`, 서로 다른 포트·브라우저·기기는 저장소를 공유하지 않습니다. 사이트 데이터 삭제나 시크릿 모드 종료·브라우저의 저장소 정리로 데이터가 사라질 수 있습니다. 브라우저 저장소를 사용하는 개발용 모사이며 공용 백엔드는 아닙니다. 이미 이전 메모리 DB에서 사라진 위키는 복구할 수 없으므로 다시 생성해야 합니다. MSW는 `npm run dev`에서만 활성화되며 preview/배포에서는 실제 API가 필요합니다. MSW는 브라우저 요청을 가로채므로 터미널의 `curl`로 Vite에 요청하면 mock 응답을 받을 수 없습니다.
- 비밀번호가 있는 위키는 `/unlock`을 제외한 해당 위키의 모든 API에서 인증을 검사합니다. 인증 전 401, 비밀번호 불일치는 403과 `WIKI_PASSWORD_INVALID`를 반환합니다. 비밀번호를 바꾸면 기존 세션을 무효화하며 `password: ''`는 비밀번호를 해제합니다.
- 인증 성공 시 `Set-Cookie`로 위키별 세션을 모사합니다. HttpOnly 속성도 포함하지만 클라이언트에서 실행되는 MSW의 가상 쿠키이므로 실제 서버의 HttpOnly 보안을 제공하지 않습니다.
- 생성 응답의 `url`은 화면 경로와 같은 요청 origin의 `/wiki/:wikiId` 형식입니다. 화면에서도 해당 ID로 위키·문서를 조회합니다. 위키 설정 수정의 200 응답 본문은 명세에 없어 위키 조회와 같은 필드를 반환하도록 정했습니다.
- `.txt` 파일은 기존 파일 읽기 검사를 재사용합니다. 크기 한도가 명세에 없어 기존 화면과 같은 10MB로 정했습니다. 초과하면 413, 잘못된 파일·빈 파일은 400입니다. `messageCount`는 빈 줄을 제외한 줄 수이며 카카오톡 메시지 파싱 결과가 아닙니다.
- AI 호출 대신 업로드한 텍스트를 예시 변환기로 처리합니다. 상태는 조회 횟수가 아닌 경과 시간으로 결정하며, 약 6초가 지난 뒤 GET 요청에서 변환합니다. 실제 백그라운드 워커는 실행하지 않습니다. 원본 대화가 사라지거나 변환 검증에 실패하면 `FAILED`를 반환합니다.
- `MERGE`는 mock 생성 문서가 있으면 본문·버전을 갱신하고 없으면 생성합니다. `REGENERATE`는 해당 위키의 mock 생성 문서만 교체합니다. 직접 만든 문서는 유지합니다. 실제 AI의 병합·재생성 정책은 서버 구현 시 확정해야 합니다.
- 문서 수정은 `content`와 양의 정수 `version`을 받고 현재 버전이 다르면 409를 반환합니다. 분류 enum은 명세에 정의되지 않아 비어 있지 않은 문자열을 받습니다. 예시는 `EVENT`, `PERSON`, `INCIDENT`입니다.
- 오류 본문은 `{ code, message }`입니다. 명세에 발생 조건이 없는 429는 자동으로 발생시키지 않습니다. 예상하지 못한 핸들러 오류는 500으로 응답합니다. 업로드 실패, 인증 실패, 다른 위키의 리소스 접근, 버전 충돌은 테스트로 확인합니다.
