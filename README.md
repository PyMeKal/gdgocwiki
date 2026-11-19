# 대화위키

카카오톡 대화를 API로 업로드하고, URL의 위키·문서 ID로 API 데이터를 조회하는 React 서비스입니다.

## 구조

- `src/components/`: 헤더, 푸터, 공통 레이아웃, 경로 안내, 버튼 링크, 안내문, 태그, 위키 섹션
- `src/components/ChatFileUpload.jsx`: `.txt` 파일 선택·드래그 앤 드롭, 읽기 상태·오류 안내, 파일 삭제
- `src/utils/readChatFile.js`: 파일 크기·확장자·내용 검사와 텍스트 읽기
- `src/Pages/HomePage.jsx`: 서비스 소개와 페이지 이동
- `src/Pages/FormPage.jsx`: 위키 제목 입력, 카카오톡 `.txt` 미리보기와 POST 업로드
- `src/Pages/WikiListPage.jsx`: 접근 가능한 위키 전체 목록
- `src/utils/wiki.js`: 공통 주석 처리
- `src/Pages/WikiHomePage.jsx`, `src/Pages/WikiPage.jsx`: URL의 ID로 위키·문서 목록·문서 본문을 GET하여 표시
- `src/api/routeHandlers.js`, `src/components/WikiApiError.jsx`: 업로드 action, 조회 loader, 비밀번호 인증과 오류·재시도
- `src/components/WikiDocument.jsx`: 제목, 계층형 목차·본문, Infobox, 주석·참고 자료를 조립하는 공통 렌더러
- `src/components/WikiInfobox.jsx`, `src/components/WikiImage.jsx`: 주요 정보 표와 이미지
- `src/components/Footnote.jsx`: 본문 주석 번호 링크와 마우스·키보드 포커스 툴팁, 스크린 리더용 주석 연결
- `src/components/WikiContent.jsx`: 본문·표·목록 및 주석 표시
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
| 내 위키 목록 | `/wikis` |
| 위키 홈·문서 목록 | `/wiki/:wikiId` |
| 위키 문서 | `/wiki/:wikiId/pages/:pagesId` |
| 문서 편집 | `/wiki/:wikiId/pages/:pagesId/edit` |
| 섹션 편집 | `/wiki/:wikiId/pages/:pagesId/edit?section=section-1` |
| 문서 제작 대기·완료 | `/wiki/:wikiId/generations/:jobId` |
| 대화 추가 | `/wiki/:wikiId/import` |

예시 위키 ID는 `550e8400-e29b-41d4-a716-446655440000`, 문서 ID는 `page_001`입니다. 경로는 `src/utils/paths.js`에서 구성하며 문서 조회·편집·돌아가기 링크는 현재 URL의 ID를 유지합니다.
`My wikis`는 이 브라우저에서 생성·방문한 위키 ID를 기록하고 각각 `GET /wikis/:wikiId`로 조회합니다. 인증이 풀리거나 삭제된 위키는 제외합니다. 전체 위키 목록 API는 없으므로 다른 브라우저에서만 방문한 위키는 표시할 수 없습니다.
위키 홈은 `GET /wikis/:wikiId`와 `GET /wikis/:wikiId/pages`, 문서 화면은 `GET /wikis/:wikiId`와 `GET /wikis/:wikiId/pages/:pagesId`를 호출합니다. 목록의 문서를 누르면 응답의 문서 ID로 이동합니다. 로딩, 빈 목록, 404·네트워크 오류와 재시도를 표시하며 로컬 예시 데이터로 대체하지 않습니다.
비밀번호가 필요한 위키는 인증 폼을 표시하고 `POST /wikis/:wikiId/unlock` 성공 후 다시 조회합니다.
생성 폼의 선택 항목인 **위키 비밀번호**를 입력하면 보호된 위키를 생성합니다. 생성 직후에는 입력한 비밀번호로 인증하여 업로드와 문서 생성을 진행하며, 인증되지 않은 브라우저에서는 위키·문서·편집·생성 작업 화면에 접속할 때 비밀번호를 요구합니다. 비워두면 공개 위키를 생성합니다.
문서 응답의 `title`, `category`, `content`를 `WikiDocument` 형식으로 변환합니다. `content`에서 줄 처음의 `##개요`·`## 개요`를 섹션 제목으로 읽고, 다음 `##` 전까지의 내용을 해당 섹션의 본문으로 표시합니다. 목차·섹션 번호·링크는 기존 렌더러가 생성합니다.
API 문서 제목 옆 **편집** 버튼은 전체 본문을, 각 섹션 옆 **편집** 버튼은 해당 섹션만 편집합니다. 섹션 제목은 `## 제목` 형식입니다. **편집 완료** 시 `PATCH /wikis/:wikiId/pages/:pageId`에 `{ content, version }`을 전송하고 원래 문서로 돌아갑니다. 저장 실패·버전 충돌 시 입력은 유지됩니다.

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

## 문서 데이터와 주석

본문에 `[* 주석 내용]`을 입력하면 순서대로 번호가 붙고, 마우스·키보드로 주석 툴팁을 확인할 수 있습니다.

제목·본문·정보 항목은 입력 데이터에서만 가져옵니다. 여행 분류나 문서 안내 등 예시 데이터는 가져온 문서에 덧붙이지 않습니다.
문자열은 공백·줄바꿈·HTML 모양의 텍스트를 그대로 보존하며, HTML을 실행하지 않습니다.
목차와 본문은 같은 섹션 트리에서 번호와 링크를 생성합니다.

### JSON 구조

전체 예시는 [public/examples/wiki.json](public/examples/wiki.json)을 참고하세요. API 응답은 기존 변환 함수로 검증합니다.

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

### 오류 처리와 보안

- API 응답의 JSON·필드 형식 오류는 화면에 안내합니다.
- 파일·JSON 입력과 API 본문은 최대 5MB, 섹션은 최대 1,000개까지 지원합니다. 초과하면 본문을 임의로 잘라 저장하지 않고 오류를 표시합니다.
- React 텍스트 렌더링을 사용하며 제목·분류·본문의 HTML을 실행하지 않습니다.

## 대화 업로드

제목과 파일을 입력한 뒤 **위키 만들기**를 누르면 `POST /wikis`로 위키를 만들고, 반환된 ID로 `POST /wikis/:wikiId/chats`를 호출합니다. 파일 선택·드래그만으로는 전송하지 않습니다.
원본 파일을 `FormData`의 `file` 필드로 전송하며, 처리 중 파일 변경·중복 제출을 막습니다. 업로드 후 `POST /wikis/:wikiId/generations`를 호출하고 대기 화면으로 자동 이동합니다. 화면은 1초마다 작업을 조회하고, JSON 변환과 문서 저장이 끝나면 **다 제작되었습니다!** 문구와 **위키로 이동** 버튼을 표시합니다.
실패하면 입력을 유지하고 오류를 표시합니다. 위키 생성 후 파일 업로드만 실패한 경우 같은 ID로 재시도하여 위키를 중복 생성하지 않습니다. 새로고침하면 이 재시도 정보는 사라집니다.
실행 순서는 **위키 생성 → 대화 업로드 → 생성 요청 → 상태 조회**입니다. 서버와 AI 에이전트가 문서를 저장하며 프런트엔드는 상태만 조회합니다.
작업이 실패하면 **대화 다시 올리기**로 재시도할 수 있습니다. AI 에이전트 연결 오류는 서버에서 해결해야 합니다.
대화 올리기에서 10MB 이하의 `.txt` 파일 하나를 선택하거나 끌어다 놓으면 파일명과 대화의 처음 2,000자를 확인할 수 있습니다.
UTF-8, BOM이 있는 UTF-16, EUC-KR 텍스트를 읽을 수 있습니다. 실제 카카오톡 내보내기 형식인지는 서버에서 검증합니다.
미리보기는 페이지 메모리에서 보관하며 새로고침하거나 페이지를 이동하면 사라집니다. 업로드 버튼을 눌러야 실제 서버로 전송합니다.

## 백엔드 API

[Swagger 명세서](http://211.233.208.44/swagger/index.html#/)를 기준으로 `src/api/wikis.js`에서 API를 호출합니다. 백엔드 주소는 `http://211.233.208.44`입니다.

기본 API 경로는 `/api`입니다. `npm run dev` 및 `npm run preview`에서는 Vite 프록시가 `/api/wikis/...`를 백엔드의 `/wikis/...`로 전달합니다. 브라우저는 같은 origin으로 요청하므로 개발 중 CORS와 교차 사이트 쿠키 제한을 피할 수 있습니다. 쿠키는 `credentials: 'include'`로 전달하고 multipart의 Content-Type은 브라우저가 설정합니다.

배포 시에도 **화면과 같은 origin의 `/api`를 백엔드로 프록시**하고 `/api` 접두어를 제거해야 합니다. Vite 설정은 정적 배포 서버에 적용되지 않습니다. 예시 Nginx 설정은 다음과 같습니다.

```nginx
location /api/ {
    proxy_pass http://211.233.208.44/;
    proxy_set_header Host $proxy_host;
}
```

`.env.example`의 `VITE_API_BASE_URL`로 API 주소를 바꿀 수 있으며 변경 후 서버 재시작·재빌드가 필요합니다. 외부 URL을 직접 지정하면 서버의 CORS·쿠키 정책이 이를 허용해야 하고, HTTPS 화면에서 HTTP API를 직접 호출하면 브라우저가 차단합니다.

API 오류는 서버의 `message`, `status`, `code`를 유지합니다. 프록시가 JSON이 아닌 오류를 반환해도 HTTP 상태를 안내합니다. 테스트는 Node 내장 기능으로 fetch를 대체하여 요청·응답 처리와 라우팅을 검증하며 실제 서버 데이터를 변경하지 않습니다.

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

비밀번호가 있는 위키는 서버가 발급한 세션 쿠키로 접근합니다. 비밀번호 변경 시 기존 세션이 무효화됩니다. 문서 수정은 조회한 `version`을 보내며 충돌 시 입력을 유지합니다. AI 에이전트 전용 작업 상태 PATCH는 프런트엔드에서 호출하지 않습니다.

위키 홈 URL 복사는 현재 화면의 origin을 사용합니다. 서버가 응답하는 `url`의 도메인과 달라도 프런트엔드 경로(`/wiki/:wikiId`)로 공유합니다.
