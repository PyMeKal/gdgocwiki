# 대화위키

카카오톡 단톡방의 대화를 위키로 정리하는 서비스의 React 화면 예시입니다.

## 구조

- `src/components/`: 헤더, 푸터, 공통 레이아웃, 경로 안내, 버튼 링크, 안내문, 태그, 위키 섹션
- `src/components/ChatFileUpload.jsx`: `.txt` 파일 선택·드래그 앤 드롭, 읽기 상태·오류 안내, 파일 삭제
- `src/utils/readChatFile.js`: 파일 크기·확장자·내용 검사와 텍스트 읽기
- `src/Pages/HomePage.jsx`: 서비스 소개와 페이지 이동
- `src/Pages/FormPage.jsx`: 문서 제목 입력, 카카오톡 `.txt` 파일 불러오기와 대화 미리보기
- `src/Pages/WikiPage.jsx`: 목차, 여행 정보, 일정표가 있는 위키 예시
- `src/App.jsx`: URL의 `page` 값에 따라 페이지 선택
- `src/index.css`: 공통 스타일과 모바일 화면 대응
- `index.html`: React 앱을 실행하는 단일 진입점

## 실행

```sh
npm install
npm run dev
```

홈은 `/`, 대화 올리기는 `/?page=form`, 위키 예시는 `/?page=wiki`에서 확인합니다.
별도 라우터 없이 링크로 이동하며, 새로고침과 위키 목차 링크도 정적 호스팅에서 동작합니다.
기존 개별 HTML 페이지는 사용하지 않습니다.

```sh
npm run lint
npm test
npm run build
npm run preview
```

배포용 파일은 `dist/`에 생성됩니다. `index.html`을 직접 여는 대신 개발·미리보기 서버를 사용해주세요.

현재 파일 전송, 대화 분석, 위키 생성·저장 및 나무위키 연동은 구현하지 않았습니다.
대화 올리기에서 10MB 이하의 `.txt` 파일 하나를 선택하거나 끌어다 놓으면 파일명과 대화의 처음 2,000자를 확인할 수 있습니다.
UTF-8, BOM이 있는 UTF-16, EUC-KR 텍스트를 읽을 수 있습니다. 카카오톡 대화의 구조를 분석하는 기능은 아직 없습니다.
파일과 내용은 페이지 메모리에서만 보관하며 서버로 전송되지 않습니다. 새로고침하거나 페이지를 이동하면 사라집니다.
