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
- `src/utils/importWiki.js`: JSON 파일 읽기·구문 검사·내부 데이터 변환과 경고
- `public/examples/wiki.json`: 3단계 목차·표·이미지·반복 주석·출처가 있는 입력 예시
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
| JSON 입력 | `/wiki/:wikiId/import` |
| 브라우저 문서 미리보기 | `/wiki/:wikiId/preview` |

예시 위키 ID는 `550e8400-e29b-41d4-a716-446655440000`, 문서 ID는 `page_001`입니다. 경로는 `src/utils/paths.js`에서 구성하며 문서 조회·편집·돌아가기 링크는 현재 URL의 ID를 유지합니다.
위키 홈은 `GET /wikis/:wikiId`와 `GET /wikis/:wikiId/pages`, 문서 화면은 `GET /wikis/:wikiId`와 `GET /wikis/:wikiId/pages/:pagesId`를 호출합니다. 목록의 문서를 누르면 응답의 문서 ID로 이동합니다. 로딩, 빈 목록, 404·네트워크 오류와 재시도를 표시하며 로컬 예시 데이터로 대체하지 않습니다.
비밀번호가 필요한 위키는 인증 폼을 표시하고 `POST /wikis/:wikiId/unlock` 성공 후 다시 조회합니다. 기본 MSW 예시 위키의 비밀번호는 `1234`입니다.
문서 본문 `content`는 HTML 실행 없이 원문 텍스트로 표시합니다. Markdown 서식 렌더링은 아직 지원하지 않습니다.
JSON 저장·기존 편집기는 현재 브라우저의 문서 하나를 사용하며 API 문서를 수정하지 않습니다. 해당 결과는 `/wiki/:wikiId/preview`에서 확인하고, 이 미리보기의 **위키 수정** 버튼으로 기존 편집기를 엽니다.
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

1. 홈이나 위키의 **JSON으로 위키 만들기** 링크를 엽니다.
2. 5MB 이하의 `.json` 파일을 선택하거나 JSON을 직접 입력한 뒤 미리보기를 누릅니다.
3. 경고와 미리보기를 확인한 뒤 **현재 위키로 저장**을 누릅니다. 저장 전까지 현재 위키는 바뀌지 않습니다.
4. **생성된 위키 보기**로 이동합니다. 저장은 현재 브라우저의 위키를 교체합니다. 기존 문서를 보관하려면 편집 화면의 **JSON으로 전체 문서 편집**에서 먼저 JSON을 복사해주세요.

제목·본문·정보 항목은 입력 데이터에서만 가져옵니다. 여행 분류나 문서 안내 등 예시 데이터는 가져온 문서에 덧붙이지 않습니다.
문자열은 공백·줄바꿈·HTML 모양의 텍스트를 그대로 보존하며, HTML을 실행하지 않습니다.
목차와 본문은 같은 섹션 트리에서 번호와 링크를 생성합니다.

### JSON 구조

전체 예시는 [public/examples/wiki.json](public/examples/wiki.json)을 참고하세요. `title`만 필수이며, 나머지는 선택 사항입니다.

```json
{
  "title": "문서 제목",
  "description": "문서 소개",
  "infobox": {
    "title": "주요 정보",
    "placement": "after-toc",
    "fields": [{ "label": "항목명", "value": "값" }]
  },
  "sections": [{
    "id": "overview",
    "title": "개요",
    "blocks": [{ "type": "paragraph", "text": "본문[^shared]" }],
    "sections": [{
      "title": "하위 섹션",
      "blocks": [{ "type": "paragraph", "text": "같은 주석 다시 사용[^shared]" }]
    }]
  }],
  "footnotes": [{ "id": "shared", "content": "공용 주석", "url": "https://example.com/source" }],
  "references": [{ "label": "참고 자료", "url": "https://example.com/reference" }]
}
```

| 필드 | 형식과 동작 |
| --- | --- |
| `title` | 필수 문자열, 1~100자. 누락·오류 시 저장하지 않고 입력 오류를 표시합니다. |
| `description` | 선택 문자열. 없으면 소개를 표시하지 않습니다. |
| `sections` | 섹션 배열. 각 섹션의 `sections`로 하위 섹션을 정의합니다. 없으면 목차·본문 섹션을 만들지 않습니다. |
| 섹션 `id` | 선택 식별자. 영문 소문자로 시작하는 영문 소문자·숫자·하이픈을 사용합니다. 없거나 중복·예약된 값이면 안전한 식별자를 생성합니다. |
| 섹션 `title` | 선택 문자열. 없으면 내용을 지어내지 않고 번호만 표시하며 경고합니다. |
| 섹션 `blocks` | 아래 콘텐츠 유형의 배열. 누락 시 빈 섹션을 유지합니다. |
| `infobox` | 선택 객체. `title`, `image`, `fields: [{label, value}]` 중 제공된 항목만 표시합니다. 값은 문자열·숫자·불리언을 지원합니다. |
| `infobox.placement` | 기본 `after-toc`: 목차와 본문 사이. `top`: 제목 다음·목차 전. `right`: 목차 다음·본문 오른쪽, 모바일에서는 본문 위로 배치합니다. |
| `footnotes` | `{id, content, url?}` 배열. 본문의 `[^id]`를 참조 순서대로 번호에 연결하며 같은 ID는 같은 번호를 사용합니다. |
| `references` | `{label?, url}` 배열. 이름이 없으면 입력된 URL을 표시합니다. |

| 콘텐츠 `type` | 필드 |
| --- | --- |
| `paragraph` | `text`: 문단 문자열 |
| `list` | `items`: 문자열 배열 |
| `table` | `rows`: 동일한 열 수의 행 배열. 셀은 문자열·숫자·불리언. `header: true`이면 첫 행을 머리글로 표시. `caption`은 표 설명. |
| `image` | `src`: 이미지 주소, `alt`: 대체 텍스트, `caption`: 선택 설명. Infobox의 `image`도 같은 필드를 사용합니다. |
| `link` | `url`: 주소, `label`: 선택 링크 이름 |

본문·목록·표 셀·Infobox 값에서 `[^id]` 공용 주석과 기존 `[* 직접 작성한 주석]`을 함께 사용할 수 있습니다.
반복 주석마다 고유한 본문·툴팁 식별자를 만들며, 하단 주석에서 각 참조 위치로 돌아갈 수 있습니다.
정의되지 않은 `[^id]`는 원문과 경고를 표시합니다. 참조되지 않은 주석도 하단 목록에 보존합니다.
편집 화면에서 하위 목차·이미지·링크를 수정할 수 있으며, Infobox·공용 주석·참고 자료는 **JSON으로 전체 문서 편집 → JSON 내용 적용 → 저장하기**로 수정합니다.
적용 전의 JSON 편집 내용도 페이지 이탈 시 경고하며, 적용하지 않은 JSON이 있으면 저장을 막습니다.

### 오류 처리와 보안

- JSON 문법·최상위 객체·필수 제목 오류는 화면에 안내하며 기존 저장 문서를 유지합니다.
- 잘못된 콘텐츠, 지원하지 않는 유형, 잘못된 표, 위험한 URL은 해당 항목만 제외하고 경고합니다. 나머지 유효한 내용은 표시합니다.
- 중첩은 최대 20단계, 섹션은 최대 1,000개입니다. 초과 부분은 경고 후 제외하며, 경고 목록은 최대 100건까지 상세 표시합니다.
- `http:`, `https:`, 같은 사이트의 상대 주소만 허용합니다. `javascript:`, `data:`, 프로토콜 없는 외부 주소(`//...`), 제어 문자·공백·역슬래시가 있는 주소는 제외합니다.
- React 텍스트 렌더링을 사용하며 입력 HTML을 삽입하지 않습니다. 새 창 링크에는 `noopener noreferrer`를 적용하고 이미지는 referrer를 보내지 않습니다.
- 브라우저 저장 공간·권한 문제로 저장하지 못하면 오류와 입력 내용·미리보기를 유지합니다.

## 대화 업로드

제목과 파일을 입력한 뒤 **대화 업로드**를 누르면 `POST /wikis`로 위키를 만들고, 반환된 ID로 `POST /wikis/:wikiId/chats`를 호출합니다. 파일 선택·드래그만으로는 전송하지 않습니다.
원본 파일을 `FormData`의 `file` 필드로 전송하며, 처리 중 파일 변경·중복 제출을 막습니다. 성공하면 메시지 수와 해당 위키로 이동하는 링크를 표시합니다.
실패하면 입력을 유지하고 오류를 표시합니다. 위키 생성 후 파일 업로드만 실패한 경우 같은 ID로 재시도하여 위키를 중복 생성하지 않습니다. 새로고침하면 이 재시도 정보는 사라집니다.
대화 분석·문서 자동 생성 요청과 나무위키 연동은 연결하지 않았습니다. 업로드만 완료한 새 위키의 문서 목록은 비어 있습니다.
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
- `src/mocks/db.js`: 위키·대화·문서 예시 데이터와 요청 간 변경 사항을 저장하는 임시 메모리 DB. 비밀번호와 내부 관계 필드는 응답에서 제외합니다. `resetDb()`로 초기화할 수 있습니다.
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
await api.getGeneration(created.id, job.jobId) // PROCESSING
await api.getGeneration(created.id, job.jobId) // COMPLETED
await api.getPages(created.id) // 고정 예시 문서 3개
```

직접 `fetch('/wikis/...')`로도 요청할 수 있습니다. JSON 요청에는 `Content-Type: application/json`과 `JSON.stringify(body)`를 사용하고, 업로드는 `FormData`의 `file` 필드를 사용하세요. `FormData`의 Content-Type은 브라우저가 boundary와 함께 설정하도록 두세요.
외부 API 주소를 사용하는 경우 쿠키 요청에는 `credentials: 'include'`가 필요합니다.

### mock 동작과 명세의 미정 항목

- DB는 브라우저 탭 메모리에서만 유지됩니다. 새로고침하면 초기 데이터로 돌아가며 기존 화면의 `localStorage` 문서에는 영향을 주지 않습니다. MSW는 브라우저 요청을 가로채므로 터미널의 `curl`로 Vite에 요청하면 mock 응답을 받을 수 없습니다.
- 비밀번호가 있는 위키는 `/unlock`을 제외한 해당 위키의 모든 API에서 인증을 검사합니다. 인증 전 401, 비밀번호 불일치는 403과 `WIKI_PASSWORD_INVALID`를 반환합니다. 비밀번호를 바꾸면 기존 세션을 무효화하며 `password: ''`는 비밀번호를 해제합니다.
- 인증 성공 시 `Set-Cookie`로 위키별 세션을 모사합니다. HttpOnly 속성도 포함하지만 클라이언트에서 실행되는 MSW의 가상 쿠키이므로 실제 서버의 HttpOnly 보안을 제공하지 않습니다.
- 생성 응답의 `url`은 화면 경로와 같은 요청 origin의 `/wiki/:wikiId` 형식입니다. 화면에서도 해당 ID로 위키·문서를 조회합니다. 위키 설정 수정의 200 응답 본문은 명세에 없어 위키 조회와 같은 필드를 반환하도록 정했습니다.
- `.txt` 파일은 기존 파일 읽기 검사를 재사용합니다. 크기 한도가 명세에 없어 기존 화면과 같은 10MB로 정했습니다. 초과하면 413, 잘못된 파일·빈 파일은 400입니다. `messageCount`는 빈 줄을 제외한 줄 수이며 카카오톡 메시지 파싱 결과가 아닙니다.
- AI 호출 대신 `db.js`의 고정 예시 3개를 사용합니다. 생성 요청은 `PENDING`, 첫 상태 조회는 `PROCESSING`, 두 번째 조회는 DB를 갱신하고 `COMPLETED`를 반환합니다. 추가 조회는 같은 결과를 반환합니다. 조회 전까지 백그라운드 작업은 실행되지 않습니다. 처리 중 원본 대화가 DB에서 사라지면 `FAILED`를 반환합니다.
- `MERGE`는 mock 생성 문서가 있으면 본문·버전을 갱신하고 없으면 생성합니다. `REGENERATE`는 해당 위키의 mock 생성 문서만 교체합니다. 직접 만든 문서는 유지합니다. 실제 AI의 병합·재생성 정책은 서버 구현 시 확정해야 합니다.
- 문서 수정은 `content`와 양의 정수 `version`을 받고 현재 버전이 다르면 409를 반환합니다. 분류 enum은 명세에 정의되지 않아 비어 있지 않은 문자열을 받습니다. 예시는 `EVENT`, `PERSON`, `INCIDENT`입니다.
- 오류 본문은 `{ code, message }`입니다. 명세에 발생 조건이 없는 429는 자동으로 발생시키지 않습니다. 예상하지 못한 핸들러 오류는 500으로 응답합니다. 업로드 실패, 인증 실패, 다른 위키의 리소스 접근, 버전 충돌은 테스트로 확인합니다.
