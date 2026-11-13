# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 따라야 할 규칙과 프로젝트 정보를 정리한 문서입니다.

## 프로젝트 개요

**The SMC Admin Platform** — The SMC 총무 업무를 위한 **모듈(Module) 기반 통합 관리 플랫폼**.
(기존 "IT 자산관리 시스템"을 폐기하지 않고 확장 가능한 플랫폼으로 리팩터링 중)

- 하나의 웹사이트, 내부는 **Feature(Module) 단위로 완전 분리** (`features/<module>`)
- **모듈 레지스트리**(`src/app/registry.ts`)에 등록하면 사이드바 메뉴 + 라우트가 **자동 생성** (확장 지점)
- 현재 모듈: Dashboard / 구매·정산(purchase) / 자산(asset) / 소모품(consumable) / 수리(repair) / 신청관리(requests) / 코드-Master / 사용자(users) / 설정(settings)
- 향후: 차량 / 계약 / 회의실 / 방문객 / 예산 관리
- 🗄️ **DB**: Google Sheets · **API**: Google Apps Script(REST 역할, 화면 없음) · 파일: Google Drive
- 배포: 한 사이트(GitHub Pages), `BrowserRouter`로 `/admin/*` 경로 분리 (`#` 없음)

## 🧭 핵심 아키텍처 원칙 (최우선 · 모든 데이터 설계의 기준)

이 프로젝트는 **'월마감 자동화 시스템'이 아니다.**
**'구매 데이터를 중심으로 총무 업무를 관리하는 플랫폼'**이다.

- **Purchase DB = Single Source of Truth(SSOT)**. 모든 기능은 Purchase DB를 **참조**한다.
- **월마감(Closing)은 하나의 Module**일 뿐이고, **정산은 하나의 Output(Export)**일 뿐이다.
- Import / Export / Dashboard / Asset / Closing / Statistics 는 서로 **느슨하게 결합(Loose Coupling)**된다.
  - 모듈은 서로의 DB에 직접 쓰지 않는다. **Purchase DB를 정해진 읽기 계약으로 참조**하고, 자산 등 이관은 **단방향**으로 넘긴다.
- **변경 격리(Adaptation Layer)**: 회사 업무 프로세스·재무 양식이 바뀌어도
  **DB 구조는 유지**하고 **Import · Export · Rule · Template만 수정**해서 대응한다.
  → 변동성이 큰 부분(입력 매핑/출력 양식/규칙)을 DB 스키마와 분리해 격리한다.

> 🅿️ **현재 상태(사용자 결정, 2026-08 기준): 구매·정산 모듈은 보류.**
> 지금은 **기존 자산관리 시스템 완성도**에 집중한다. 아래 SSOT 원칙·도메인 문서는 **재개 시** 적용하며,
> 재개 결정 전에는 **6~11단계(Master/Purchase/API/DB)를 진행하지 않는다.** (구매 업무 파악이 아직 진행 중)
> 1~4단계(모듈 플랫폼 틀)는 유지 — 자산 시스템은 이 구조 안에서 정상 동작한다.
>
> 📎 재개용 참고: [docs/PURCHASE_DOMAIN.md](docs/PURCHASE_DOMAIN.md) (구매·정산 도메인 지식)

## 기술 스택

- **React 18 + TypeScript + Vite**
- 라우팅: `react-router-dom` (BrowserRouter, `/admin/*`) — GitHub Pages 새로고침은 빌드시 생성되는 `dist/404.html` SPA 폴백으로 대응
- 차트: `recharts` / 아이콘: `lucide-react`
- 테스트: `Vitest` + `@testing-library/react`
- 품질: `ESLint` + `Prettier` / 문서: `TypeDoc`
- 백엔드: Google Apps Script (Sheets 저장 / Slack 알림 / Gmail 자동회신)

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (http://localhost:5173) |
| `npm run build` | 타입 검사 후 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 (경고 0 기준) |
| `npm run format` | Prettier 포맷 정리 |
| `npm run typecheck` | 타입만 검사 |
| `npm run test` | 테스트 실행 |
| `npm run docs:api` | JSDoc → API 문서 생성 (`docs/api/`) |

> Windows 환경. 새 터미널에서 `node`/`npm`/`git`이 인식 안 되면 PATH 새로고침 또는 VSCode 재시작 필요.

## 코딩 컨벤션 & 규칙 (필수 준수)

1. **TypeScript** 사용, 타입을 명확하게 작성 (strict 모드).
2. **모든 함수에 JSDoc 주석**을 단다. (`@param`, `@returns` 포함)
3. **중요한 로직에는 "왜 이렇게 구현했는지" 설명하는 주석**을 단다.
4. **컴포넌트는 하나의 역할만** 하도록 분리한다.
5. **파일당 300줄을 넘지 않게** 작성한다.
6. **중복 코드는 커스텀 훅(`hooks/`)이나 유틸 함수(`lib/`)로 분리**한다.
7. **변수명·함수명은 의미 있게** 작성한다.
8. **ESLint / Prettier 기준**에 맞게 작성한다. (커밋 전 `lint`·`format` 통과)
9. **테스트 코드**를 함께 작성한다. (로직/컴포넌트 단위)
10. **폴더 구조 일관성**을 유지한다. (아래 구조 참고)
11. **변경 사항마다 Git 커밋 메시지를 추천**한다. (`feat:`, `fix:`, `chore:` 등 컨벤셔널 커밋)

### 세부 관례

- 선택 옵션·enum은 `constants/`에 `as const` 배열로 정의하고 **유니온 타입을 파생**시킨다. (옵션 추가 시 한 곳만 수정)
- 상태값→UI 매핑 등은 `Record<Union, ...>`로 작성해 **누락을 컴파일 에러로** 잡는다.
- 경로 import는 별칭 **`@/`** (= `src/`)를 사용한다.
- CSS는 컴포넌트별 `.css` 파일로 두고, 색상·간격은 `styles/global.css`의 CSS 변수를 쓴다.
- 폼 값은 문자열로 다루고, 저장 시점에 도메인 타입으로 변환한다.

## 폴더 구조

```
src/
├─ app/          플랫폼 코어
│  ├─ types.ts       ModuleDef 타입
│  ├─ registry.ts    MODULES 배열 (모듈 등록 = 메뉴·라우트 자동 생성)
│  └─ router.tsx     MODULES → /admin/<path> 라우트 자동 생성
├─ types/        도메인 타입 (Asset, RepairTicket, ChangeLog, AppUser, Consumable)
├─ constants/    선택 옵션·enum — as const 파생
├─ config/       백엔드 연동 설정 (GAS URL, API 토큰)
├─ lib/          순수 유틸/클라이언트 (gasClient 등, + *.test.ts)
├─ hooks/        공통 커스텀 훅 (useForm 등)
├─ components/
│  ├─ ui/        표현용 순수 UI (Card, Badge, StatCard, + 예정: Button/Table/Modal/Breadcrumb)
│  ├─ form/      재사용 폼 (FormSection, FormField, TextInput, SelectField)
│  ├─ layout/    AdminLayout · ModuleSidebar · TopBar (공통 레이아웃)
│  └─ feedback/  안내 (ComingSoon)
└─ features/     모듈별 폴더 (한 모듈 = 한 폴더, index.ts에서 ModuleDef export)
   ├─ dashboard/  asset/  repair/          (구현됨)
   └─ purchase/  consumable/  master/  users/  settings/   (뼈대·ComingSoon)
```

> ✅ **미사용 레이아웃 정리 완료**: 피벗 잔재(AppShell·AdminSidebar·sidebarConfig·Employee/Support 레이아웃·BottomNav·bottomTabs·features/landing) 제거됨.
> 현재 `layout/`은 `AdminLayout · ModuleSidebar · TopBar · MobileHeader`만 유지.
> (참고: `public/videos/main_video.mp4`는 랜딩 제거로 미참조 상태 — 필요 없으면 삭제 가능)

자세한 설계·데이터 모델은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 참고.

## 라우트 맵 (BrowserRouter)

| 경로 | 화면 |
| --- | --- |
| `/` | → 로그인 역할의 홈으로 리다이렉트 |
| `/request` | 직원 신청 폼 (자산신청/소모품/수리/반납/자산교체 탭, employee 역할) |
| `/vendor` | 외부업체 수리 목록 (vendor 역할) |
| `/admin/dashboard` | 대시보드 |
| `/admin/purchase` | 구매·정산관리 (준비중) |
| `/admin/assets` | 자산관리 (기존 자산등록) |
| `/admin/consumables` | 소모품관리 (준비중) |
| `/admin/repair` | 수리관리 (기존 수리요청) |
| `/admin/requests` | 신청관리 (직원 자산/반납/소모품 신청 접수·처리) |
| `/admin/master` | 코드(Master)관리 (자산구분·렌탈사·소모품·제조사 선택지 관리) |
| `/admin/users` | 사용자관리 (목록/등록/수정) |
| `/admin/settings` | 설정 (메뉴 토글 + 부서(조직)·사용위치 관리 + 코드/로그인 비밀번호 관리) |

## 진행 현황 — 1차(IT 자산 시스템) 완료분

- [x] **0단계** 기반 세팅 (TS 전환, ESLint/Prettier/Vitest/TypeDoc, 타입·상수, 문서)
- [x] **1단계** 공통 UI (Card / Badge / StatCard)
- [x] **2단계** 관리자 대시보드 (이미지 ④)
- [x] **3단계** 자산 등록 (이미지 ②, 모바일)
- [x] **4단계** 수리 요청 (이미지 ③) — 3단계 폼 + 완료화면 + AI 봇 UI
- [x] **5단계** 백엔드 연동 — GAS 웹앱 연결 완료 (GET/POST 검증됨, 시트 저장·접수번호 발급 정상)
  - 세팅 방법: [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md)
  - `src/config/api.ts`의 `GAS_URL`에 실제 웹앱 URL 반영됨
- [x] **보안** 공유 토큰 검증 구현 — 잘못된/없는 토큰 요청 거부 확인
  - 토큰은 `.env`의 `VITE_API_TOKEN`(git 미포함) + Apps Script `Code.gs`의 `API_TOKEN`이 일치해야 통과
- [x] **자산등록 POST 검증** — 실제 저장(`2_자산등록기록`) + 대시보드 집계 반영까지 엔드투엔드 확인
- [x] **관리자 대시보드 실데이터 연동** — GAS `doGet ?action=dashboard`(v3) + `useDashboardData` 훅
  - 위젯 6종 props 기반, 실데이터 없으면/부분이면 mock 폴백 병합
  - 현재 배포: `v3-dashboard`, `GAS_URL`은 새 배포 URL로 반영됨

## 🏗️ 플랫폼 전환 (The SMC Admin Platform) — 12단계

> 각 단계는 **사용자 승인 후** 다음 단계 진행. 기존 코드 최대한 재사용, 폐기 없음.
> 🅿️ **6~11단계(구매·정산 관련)는 현재 보류.** 1~4단계 구조는 유지하고, 지금은 자산관리 완성에 집중.

- [x] **1단계** 현재 구조 분석
- [x] **2단계** 새 플랫폼 구조 설계 (모듈 레지스트리 / 단일 Layout / `/admin/*` / GAS·Sheets 분리)
  - 결정: BrowserRouter · 기존 직원/서포트 화면은 admin 모듈로 통합 · `/`→`/admin/dashboard` · 폴더명 `features/` 유지
- [x] **3단계** 폴더 구조 리팩터링 (asset-register→asset, repair-request→repair, 신규 모듈 뼈대, 모듈 레지스트리 도입)
- [x] **4단계** 라우팅 전환 (BrowserRouter + 레지스트리 자동 라우트 + AdminLayout/ModuleSidebar + 404.html + 모듈 lazy)
- [ ] **5단계** 공통 Layout 완성 ← **다음 시작점**
  - AdminLayout에 Header(Breadcrumb·검색·사용자) + Footer + 반응형(모바일 드로어)
  - 공통 컴포넌트 보강: Button / Table / Modal / Breadcrumb (Notion·Linear·Material 톤)
  - 미사용 레이아웃 파일 정리(AppShell/AdminSidebar/Employee·Support/BottomNav/landing 등)
- [ ] **6단계** 데이터 아키텍처(SSOT) + Master(코드) 구조 설계 ← **Master/Purchase 진입 전 필수 선행**
  - Purchase DB를 SSOT로 확정. Import→DB 매핑 규칙(Rule), DB→출력 템플릿(Template), 모듈 간 읽기 계약 정의
  - 변경 격리: DB 스키마 고정, 변동성은 Import/Export/Rule/Template로 흡수
- [ ] **7단계** Purchase(구매·정산) Module 설계 — **Purchase DB(SSOT) 중심**
  - 프로세스: 아마란스 구매품의 Import(엑셀) 또는 직접등록/정기지출 → 구매 → 영수증 Drive 저장 → Master 자동매핑 → **Purchase DB 적재** → (Output) 월마감 시트 해당 월 탭 작성 → 아마란스 정산품의 등록 (※ 아마란스 API 미사용, Excel Import 기반)
  - 월마감=Module, 정산=Output. 둘 다 Purchase DB를 참조하는 파생물일 뿐
- [ ] **8단계** Dashboard 개선
- [ ] **9단계** Asset Module 연계 (구매 완료 품목 중 자산 대상 → '자산 등록'으로 전달. 예: 노트북/모니터/프린터. Claude·ChatGPT·택배·렌탈료·전기/통신비 등은 구매·정산에서만 관리)
- [ ] **10단계** GAS API 설계 (Main.gs 라우터 + module/action 디스패치 → 서비스별 .gs 분리)
- [ ] **11단계** DB(Sheets) 설계 (Master들 + Purchase/Asset/Consumable/Repair/Receipt/Closing_DB) — **Purchase_DB = SSOT** 기준, 6단계 설계 확정본을 실제 시트로 구현
- [ ] **12단계** 최종 리팩터링

## ⚠️ 미해결 (다음 세션 / 비공개 배포 시 처리)

- ✅ **GAS 토큰 ON 완료 (2026-09-09, `tokenEnabled:true` 검증됨)** — 토큰 없음/오류 요청 거부, 올바른 토큰만 통과 확인.
  - CI 빌드 토큰 주입: `.github/workflows/deploy.yml` build 스텝 `VITE_API_TOKEN: ${{ secrets.VITE_API_TOKEN }}`.
  - 값 위치: GitHub 저장소 **Actions → Repository secret** `VITE_API_TOKEN` = Apps Script **스크립트 속성** `API_TOKEN`(이름 정확히 대문자!) = 로컬 `.env` `VITE_API_TOKEN` — **세 곳이 동일해야 함**.
  - 켜는 순서(재발급/교체 시): ① Repository secret 갱신 → ② main 재빌드(빈 커밋 push 또는 Actions 수동 실행)로 토큰 포함 배포 → ③ 스크립트 속성 같은 값 저장 → ④ 새 버전 재배포. (프론트 먼저, 서버 나중 — 순서 어기면 요청 거부됨)
  - 함정 기록: 스크립트 속성 이름을 `vite_API_TOKEN`으로 오타 시 미적용. 반드시 `API_TOKEN`.
- 실운영 전 **토큰 재발급(rotation)** — 현재 값은 이번 세션 대화에 노출됨. 위 순서로 새 랜덤 값 교체 권장(급하지 않으면 유지 가능).
- **접근 제어 = 역할별 비밀번호 게이트** (admin/employee/vendor, SHA-256, `src/config/auth.ts` 기본해시 + `auth/useRoleAuth`). 입력 비번으로 역할 판별 → 역할별 화면. Google OAuth는 조직 정책 이슈로 보류.
  - **비밀번호 설정 화면에서 변경 가능**(설정 → 로그인 비밀번호 관리, `AuthSettingsSection`). 평문 대신 SHA-256 해시만 서버(시트 `10_로그인설정`)에 저장 → 모든 기기 공유. `app/authSettings.ts`(기본해시+오버라이드 병합, pull 1회/push) + useRoleAuth가 유효해시로 판별. 분실 시 복구 불가(코드 기본값으로 리셋 필요).
  - 한계: 클라이언트 측 게이트(데이터는 GAS 토큰으로 별도 보호). 더 강한 보호는 GAS 비밀번호/토큰 검증으로 업그레이드 가능.
- **배포 완료**: GitHub **`thesmc/smc-admin`**(조직 이전, 2026-09-10) → Pages **`https://thesmc.github.io/smc-admin/`** (GitHub Actions 자동배포, vite base `/smc-admin/`). 공용 비밀번호 게이트로 접근 제한 중.
  - ⚠️ 조직 이전 시 재설정 필요했던 것: **Actions Secret `VITE_API_TOKEN` 재등록**(시크릿은 이전 안 됨) + **Pages Source: GitHub Actions 재지정**. 로컬 remote는 `thesmc/smc-admin`로 갱신됨. (구 `hoon2-cpu.github.io` 주소는 중단)
- **테스트 행 정리** — 시트의 `[테스트]`/`[토큰검증]`/`[연결테스트]`/`[검증]`/`[v11검증]` 및 자산 `AST-2026-0002` 등 삭제. (실운영 데이터 넣기 전)

## 다음 진행 후보 (미완) — 현재 방향: 자산관리 시스템 완성

> **2026-09-09 세션 정리:** 실운영 마감·추가요청 대거 반영·배포 완료(GAS `v23-asset-swap`).
> - ✅ **GAS 토큰 ON**(CI Secret 주입 + 스크립트 속성, 3곳 동일). ✅ 수리 사진 실이미지(Drive)+라이트박스. ✅ 조직/코드/로그인비번 서버저장(설정 화면 편집). ✅ 대시보드 바로가기 동작. ✅ 수리 접수확인 메일(이메일칸). ✅ 직원 **자산교체 신청 탭**(6_신청기록, 신청관리 연동).
> - ⏳ 남은 것: **시트 테스트행 정리** · **자산장부 실이관**(docs 가이드, 사용자작업) · (선택) 모바일 상세모달/터치영역 추가점검 · 보고서 화면 · Slack 봇 알림.
> - 🔗 배포: **thesmc 조직 이전 완료** → `https://thesmc.github.io/smc-admin/admin` (Secret/Pages 재설정 완료). GAS 토큰 ON.
> - 🧩 공통 피드백 컴포넌트: `components/feedback/LoadingState·EmptyState·MockNotice`(목록 화면 로딩/빈상태/mock 배너 통일).
> - ✅ **UI 다듬기(2026-09-10) 완료분**: 빈상태·로딩 통일 / 로그인 영상 **poster**(`login_bg_poster.jpg`, 깜빡임 제거) / **모바일 좌우밀림 방지**(global.css: html·body·#root `overflow-x:hidden`·`overscroll-behavior-x:none` + 전역 `box-sizing:border-box`) / **대시보드 섹션 그룹 헤딩**(`dash-section`/`dash-section-title`: 현황 요약·자산 현황·최근 이동).
>
> - ✅ **2026-11-12 추가요청 (2차) — 슬랙 1:1 DM 챗봇으로 확장** _(⚠️ GAS `v30-slack-dm-bot` 재배포 + 스크립트 속성/슬랙 Events 설정 필요)_: `/문의` 슬래시에 더해 **봇에게 1:1 DM**하면 자동 1차 대응. Events API(`message.im`) → `handleSlackEvent_`(URL challenge + event_id 중복방지 + 봇/수정메시지 무시) → `generateBotAnswer_`가 FAQ+Gemini로 답(+끝에 `<ESCALATE>` 태그로 미해결 판별) → `postSlack_`로 요청자 DM. **미해결(ESCALATE)일 때만**: 요청자에게 **수리신청 링크**(`/request`)+로그인 안내, 총무팀(`ADMIN_SLACK_IDS` 전원)에 **관리자 링크**(`/admin`)+안내 DM(`notifyAdminsSlack_`, `dmUser_`=conversations.open→postMessage). **비밀번호는 평문 미저장이라 링크+안내만**(사내 공지 참고). 스크립트 속성: `SLACK_BOT_TOKEN`·`ADMIN_SLACK_IDS` 추가. 슬랙 Events 구독 Request URL = GAS `/exec`, 봇 스코프 `im:history`·`chat:write`·`im:write` 필요. ⚠️ GAS 3초 제한 → event_id 캐시로 중복 처리 방지(응답은 chat.postMessage로 별도 전송되므로 지연돼도 1회만 전달).
>   - 🔁 **2026-11-12 최종 결정 — GAS 슬랙봇 폐기, 독립 Python 봇으로 이전.** GAS 웹앱은 `/exec`가 302 리다이렉트를 거치며 **POST 본문이 유실**돼 Slack **Events API(1:1 DM)** 엔드포인트로는 부적합(doPost에 `postData 없음`으로 도착). `/문의` 슬래시도 포기하고 **DM 자동응답은 별도 Python 봇**으로 구현.
>     - **봇 위치(저장소 밖, git 무관)**: `C:\Users\p-d0449\Desktop\Slackbot\auto_reply.pyw`. slack_bolt **Socket Mode**(App-Level Token `xapp-` + Bot Token `xoxb-`) + **Claude**(anthropic SDK, 기본 `claude-haiku-5-5`). 키워드 매칭(모니터/노트북/pc 등) → `ask_claude`(FAQ 컨텍스트, 끝에 `<ESCALATE>`로 미해결 판별) → 요청자 DM, 미해결 시 수리링크 + `ADMIN_SLACK_IDS` DM 알림. 자기메시지 루프는 bolt `IgnoringSelfEvents`가 차단. **FAQ는 이 GAS에서 읽음**: 봇이 매 질문마다 `GET ?action=faq&token=API_TOKEN` 호출 → 웹앱 'FAQ/챗봇'(`11_FAQ`) 편집이 봇에 즉시 반영(봇 재시작 불필요). 전용 새 Slack App(App ID `A0CGVV9QRC5`) 사용, 스코프 `im:history`·`chat:write`·`im:write`, `message.im` 구독 + Reinstall. ⚠️ 상시 실행 필요(PC 꺼지면 멈춤).
>     - 🧩 **동작 검증됨(2026-11-12)**: DM 수신→Claude 호출→답변/총무팀알림 발송(200) 확인. ⏳ 남은 것: **Claude API 키/크레딧**(유효 키 + billing $5 — 무료 Gemini는 신규계정 `AQ.`키가 free-tier 0으로 막혀 사실상 불가) · FAQ 실제 채우기 · (선택) **"사람(나)에게 온 DM 가로채 응답"**은 사용자토큰(`im:history`) 필요 = 8명 각자 OAuth·전원 DM 열람(프라이버시 부담) → 본인 것부터 검증 후 확장, 안 되면 '전용 채널' 방식 대안.
>   - 🗑️ **GAS 정리(`v41-faq-only`)**: 슬랙/Gemini 죽은 코드 제거(`handleSlackSlash_`·`handleSlackEvent_`·`generateBotAnswer_`·`postSlack_`·`dmUser_`·`notifyAdminsSlack_` + doPost 슬랙 분기 + Gemini/Slack 설정변수). **FAQ·자산관리는 전부 유지**. 스크립트 속성은 **`API_TOKEN`만 유지**, 나머지(`GEMINI_API_KEY`·`SLACK_*`·`ADMIN_SLACK_IDS`) 삭제 가능.
> - ✅ **2026-11-12 추가요청 (1차) 완료분** _(⚠️ GAS `v29-slack-faq-bot`)_: ①`2_자산등록기록` 시트 분리 문의 → **분리 안 함 권장(SSOT)**. 단일 시트 유지 + 화면 뷰(취득구분 탭·본부 필터·보고서)로 대응이 원칙. (조언만, 코드 변경 없음) ②**자산 라벨 QR 확대**(18→21mm)·중앙정렬·로고/QR/자산번호만 표기(`labelPrint.ts`). ③**슬랙 챗봇(FAQ+Gemini)**: 슬랙 `/문의 질문` 슬래시 커맨드 → GAS `handleSlackSlash_` → `11_FAQ`를 컨텍스트로 Gemini(`askGemini_`, 모델 `gemini-2.0-flash`) 1차 답변(ephemeral). 모를 땐 '총무팀 문의' 안내. **FAQ 편집 = 새 사이드바 메뉴 'FAQ/챗봇'**(`features/faq/`, `faqModule` order 10, GET `faq`/POST `faqUpdate`, 시트 행=질문/답변/키워드). **스크립트 속성 필요: `GEMINI_API_KEY`(필수), `SLACK_SLASH_TOKEN`(선택, 슬래시 검증토큰)**. 슬랙 슬래시 커맨드 Request URL = GAS 웹앱 `/exec`. (※ 슬랙은 form-encoded라 doPost가 JSON 파싱 전에 `e.parameter.command`로 분기)
> - ✅ **2026-11-11 추가요청 (2차) 완료분** _(⚠️ GAS `v27-user-division-dateonly` 재배포 필요 + 사용자 시트작업 1건)_: ①`5_사용자목록`에 **본부열(인덱스2, 부서 왼쪽)** 추가 — buildUsers_/register/update 재인덱싱, `UserRow.division`, 사용자 폼/목록에 본부(본부→부서 연동). **사용자가 시트 C열 앞에 빈 열 삽입 필요**(기존데이터 자동 우측이동). ②시트 '일시' 칸 **날짜만 저장**(시각 제외) — GAS `stamp_()`(yyyy-MM-dd 문자열)로 신청/등록/접수/변경로그/처리일시/반납일 기록. 접수번호 생성용 `now`(Date)는 유지. ③**회계장부(감가상각) 내보내기** — '보고서 조회'에 '자산 명세/회계장부' 탭 추가. 새 시트 없이 자산데이터로 계산(`config/depreciation.ts`: 품목별 내용연수+정액법 잔존가, 기준일=오늘, 폐기=0). 취득자산·취득가액·내용연수·경과연수·잔존가·폐기일자. `reportExport.ts` 일반화(asset|ledger). ④**파비콘** index.html `<link rel=icon href=/favicon.png>`+apple-touch 배선 → `public/favicon.png`(512×512 권장)·`public/apple-touch-icon.png`(180×180) 넣으면 적용. ⑤문서 타이틀 `IT 자산관리 대시보드`→`자산관리 플랫폼`. ⑥로그인 브랜드 `The SMC Admin Platform`→`The SMC Platform`. ⑦**긴 화면 정리**: 공통 `Card`에 `collapsible`+`storageKey`(접이식, 상태기억) 추가 → 설정 4섹션·코드마스터 그룹별 아코디언. 자산관리는 표 특성상 아코디언 대신 **본부 필터 드롭다운**(본부별 show/hide).
> - ✅ **2026-11-11 추가요청 (1차) 완료분** _(GAS `v26-guest-access`)_: **'비밀번호 없이 입장' 임시 개방 토글**. 설정 화면 `GuestAccessSection`(서버 저장, 모든 기기 공유) → 켜면 로그인 화면(`AuthGate`)에 **'비밀번호 없이 입장(총무팀)' 버튼** 노출 → `enterGuest`가 admin으로 입장(localStorage `smc.role.guest='1'` 표시). 끄면 guest로 들어온 세션은 새로고침·재방문 시 무효화(`loadRole`에서 토글 OFF면 세션 제거). 비밀번호 로그인 세션은 유지. 서버 저장은 기존 `10_로그인설정` A1 JSON에 `guestEnabled` 필드 추가(`authSettings.ts`: `readGuestEnabled`/`saveGuestEnabled`, GAS `handleAuthSettingsUpdate_`가 `guestEnabled` 보존). ⚠️ 보안: 켜 둔 동안 접근 제어 사실상 해제 — 필요할 때만 켜고 바로 끌 것.
> - ✅ **2026-11-08 추가요청 (2차) 완료·배포·검증 완료** _(GAS 변경 없음 — 재배포 불필요, 프론트만 배포)_: ①`/vendor` 상세에 **사용자 현재 위치 표시**(v25에 이미 반영, 접수분부터). ②구글슬라이드 자리배치도 자동 추적 → **보류**(사용자 결정: 슬라이드 자유도형이라 특정 인원 자동 크롭 불안정 + GAS Slides 권한 필요). ③`/admin` **수리관리 목록에서 완료 건 숨김**(`RepairListPage`가 `status!=='완료'`만 표시, 상세에서 완료 저장 시 즉시 사라짐 — 시트·요약카드엔 완료로 남음). ④대시보드 바로가기 **'보고서 조회' → `ReportModal`**(전체/자산등록 기간·본부·부서·품목·사용자 필터 → **CSV(엑셀, UTF-8 BOM) 다운로드** + **인쇄→PDF 저장**, `features/dashboard/report/`). ⑤**자산 라벨 일괄 인쇄 300dpi 최적화**(도시바 B-FV4·50×30mm: QR 400px·여백 2모듈, `print-color-adjust:exact`, 용지=라벨 고정, 인쇄설정 안내문구). 버튼·로직은 기존 `printAssetLabels` 그대로.
> - ✅ **2026-11-08 추가요청 (1차) 완료분**: ①직원 신청 **모든 탭(자산/소모품/반납/교체)+수리요청**에 **이메일·현재 위치** 입력 추가 → `6_신청기록` 12(이메일)/13(위치)열, `1_수리접수기록` 13(이메일)/14(위치)열 저장. 신청관리·수리 상세 모달에 표시. ②수리요청 시 **총무팀(`ADMIN_EMAIL`=hoon2@thesmc.co.kr)에게 접수 알림 메일** + **신청자에게 접수확인 메일** 2종 발송. ③수리요청 **완료 팝업 즉시 표시**(사진 업로드가 길어 중복 접수되던 문제 — `submitting` 가드 + 버튼 `disabled`/‘접수 중…’). ④외부업체 `/vendor` 상세에 **진행상황 드롭다운(확인/수리중/완료)+저장**(`updateRepair`, 담당자=외부업체) → **완료 시 목록에서 제거**(`vendorRepairs` 필터 `dispatched && status!=='완료'`, 시트엔 완료 기록). `REPAIR_STATUSES`에 `확인` 추가. **GAS `v25-request-contact` (✅ 배포·검증 완료 — 프론트 캐시만 강력새로고침/시크릿창으로 비우면 즉시 반영).**
> - ✅ **2026-09-11 추가요청 완료분**: 알림 벨 실신청 연동(미확인 뱃지+모두확인 읽음처리, localStorage) / 대시보드 신청현황·폐기예정 **실데이터 연동**(GAS `v24-dashboard-live`, 실모드에선 mock 미혼합) / 자산검색 보강+**사용자/상태 필터 드롭다운**+결과건수 / **목록 key 중복 잔상 버그 수정**(index 포함) / index.html **캐시 무효화 메타**(배포 즉시 반영) / 직원 신청 **다건 입력**(자산·반납·교체, `submitRequestBatch`). **수리 다건은 보류**(사진·증상이 자산별로 달라 별도 설계 필요).
>
> _(이전 2026-09-04: 2차 개편 백로그 9건 + 추가요청 6건 완료)_

- [x] **(마지막 백로그) #2 수리 사진 실이미지 — 완료·배포·동작 확인(2026-09-09)**. 프론트 이미지 캔버스 축소(`lib/imageResize.ts`, 1400px·JPEG q0.7) → `submitRepairRequest`가 `images`(dataURL) 전송 → GAS `saveRepairPhotos_`가 **사용자 공유 Drive 폴더(`REPAIR_PHOTO_FOLDER_ID`=`1SQvcRRHQusU6JaIRwF-pd1EiHAKsEYqf`)** 에 저장 → 시트 8열에 `thumbnail?id=..&sz=w1600` URL 저장. `RepairPhotos` 컴포넌트가 URL이면 `<img>` 썸네일(클릭 시 **앱 내 라이트박스** 크게 보기·ESC/배경 닫기·새 탭 원본), 아니면 파일명(과거분) 표시(VendorDetailModal·RepairDetailModal). 응답에 `photoInfo{received,saved,errors}` 진단 포함(저장 실패 시 프론트가 사유 alert).
  - ⚠️ **Drive 권한 함정(해결됨)**: 웹앱은 재배포해도 권한창이 안 뜸 + 읽기전용만 승인되면 `createFile` 실패. → 편집기에서 **`authorizeDrive`(테스트 파일 생성)** 실행해 **Drive 쓰기 스코프**를 승인해야 함. 안 뜨면 myaccount.google.com/permissions에서 앱 권한 삭제 후 재실행. (토큰=스크립트 속성이라 유지)
- [ ] **GAS 토큰 복구**(비공개 배포 시, 위 미해결 참고) + 시트 테스트 행 정리
- [ ] **자산장부 실이관** — [docs/ASSET_LEDGER_IMPORT.md](docs/ASSET_LEDGER_IMPORT.md) 가이드대로 3개 장부를 `2_자산등록기록`에 붙여넣기(사용자 작업). 이관 후 부서/위치를 설정값과 정합화.
- [x] 조직/위치 설정 **서버(시트) 저장** — 완료(GAS `8_조직설정` A1 JSON, `orgSettings`/`orgSettingsUpdate`). localStorage는 캐시. ⚠️ GAS v19 재배포 필요.
- [x] GitHub push → Pages 배포 완료 (`https://thesmc.github.io/smc-admin/`, thesmc 조직 이전 완료)
- [x] Master(코드) 모듈 구현 — 자산구분·렌탈사·소모품·제조사 선택지 서버 저장(⚠️ GAS v20 재배포 필요)
- [ ] (선택) 공통 Layout 다듬기 · 디자인/문구 다듬기

> 구매·정산(6~11단계)은 보류 상태. 재개하려면 [docs/PURCHASE_DOMAIN.md](docs/PURCHASE_DOMAIN.md)부터 검토.
> 로그인 영상 추가 압축/poster가 필요하면 로컬 ffmpeg로 재인코딩 가능(위 로그인 화면 메모 참고).

> GAS 재배포로 URL이 바뀌면 `src/config/api.ts`의 `GAS_URL`도 갱신해야 함.
> 배포 반영 확인: 웹앱 GET → `version` 필드로 판별. **배포됨: `v44-repair-revert`(= 사용자 "V46" 배포, 2026-11-13). 코드=배포 일치.**
> - **2026-11-13 추가요청 4건 완료**: ①수리접수 '완료' 시 연결 자산이 '수리중'이면 '사용중'으로 **자동 복귀**(`revertAssetFromRepair_`, 폐기 등은 보존, 3_변경로그 기록) → 대시보드·자산탭 '수리 중' 집계 자동 감소. ②③**자산·사용자 목록 페이지네이션 20줄**(`hooks/usePagination.ts` + `components/ui/Pager`, 필터/검색 변경 시 1p 리셋). ④**OG 메타태그**(index.html: og/twitter, 절대 URL) + `public/og-image.png`(1200×630) → 링크 미리보기. (GAS는 ①만 관련, 나머지는 프론트.)
> - (이전) v43-sender-from(보낸사람 From=general_affairs, Gmail 별칭 선행 필요) · v42(신청 5종 접수메일 + ADMIN_EMAIL=general_affairs 수신)는 v44에 포함돼 함께 배포됨.
> - v42(배포·검증): ①슬랙/Gemini 코드 제거(FAQ·자산관리 유지) ②`ADMIN_EMAIL`=`general_affairs@thesmc.co.kr`(=받는사람)로 변경 ③직원 신청 5종 전부 접수 메일 — 수리신청(기존) + 자산/소모품/반납/교체(신규 `notifyRequestEmails_`: 총무팀 알림 + 신청자 접수확인, 폼 이메일 우선·없으면 사용자목록). **general_affairs@ 수신 테스트 성공(2026-11-12).**
> - v43(코드만, 미배포): 보낸사람(From) = `SENDER_EMAIL`(general_affairs@)/`SENDER_NAME`('총무팀') — 공용 `sendMail_` 래퍼(별칭 미등록 시 기본계정으로 폴백). + 편집기 테스트 함수 `testMail`. **From 표시를 실제로 바꾸려면: hoon2 Gmail '다른 주소에서 메일 보내기'에 general_affairs@ 등록·인증 → v43 재배포.** 안 해도 받는 기능은 정상.
> - 슬랙 DM 챗봇은 GAS가 아니라 독립 Python 봇(`Desktop\Slackbot\auto_reply.pyw`)으로 이전. 스크립트 속성은 `API_TOKEN`만 유지.

## 🔀 역할 기반 개편 로드맵 (진행 중)

> 사용자 요구(2026-08): **총무팀 / 일반직원 / 외부수리업체** 3개 역할(화면)로 분리.
> 인증은 **역할별 비밀번호**로 진행(Google OAuth는 조직 정책으로 보류). 모든 화면 **모바일 반응형**.

- [x] **1) 모바일 반응형** — 관리자 레이아웃을 모바일 드로어/햄버거로 정비(1차 완료). 페이지별 추가 폴백 가능.
- [x] **2) 역할/라우팅 분리** — `/admin`(총무팀) · `/request`(직원) · `/vendor`(외부업체) + 역할별 비밀번호 게이트(`useRoleAuth`). 직원/외부업체는 `RoleShell` 골격만(내용은 ③④).
  - 비밀번호(기본): admin=`smc-admin-2026`, employee=`smc-staff-2026`, vendor=`smc-vendor-2026` (`src/config/auth.ts` 해시)
- [x] **3) 직원 신청 폼** — `/request`에 자산신청·수리신청(기존 재사용)·반납신청 탭. 자산/반납신청은 GAS `6_신청기록` 저장(assetRequest/returnRequest), 수리신청은 기존 repairRequest. GAS `v10-requests`.
- [x] **4) 외부업체 페이지** — 총무팀 수리 상세의 **'외부업체 전달'** 버튼(총무팀 전용) → GAS `repairDispatch`로 외부전달 표시(12열) → `/vendor`는 `vendorRepairs`(전달된 건만) 조회·표시. 일반 사용자는 전달 불가(총무팀 검토 후만). GAS `v11-vendor`.

> 총무팀 전체관리 필수 항목: 자산 접수확인 · 자산 등록 · 자산 폐기 · 재고자산 · 사용중 자산 확인.

## 🔧 2차 개편 백로그 (요청 9건, 2026-08)

> 승인 후 하나씩. 의존성 표기 참고.

- [x] **1) 알림 아이콘** — 클릭 시 드롭다운(빈 상태) + 가짜 뱃지 제거. (완료)
- [x] **2) 외부업체 요청 클릭 팝업 + 사진 실이미지** — `/vendor` 카드 클릭 → `VendorDetailModal`(증상·자산·첨부 상세). 사진은 **Google Drive 업로드 후 실이미지 표시** 완료(`RepairPhotos` 컴포넌트, URL=`<img>`/과거분=파일명). 프론트 축소(`lib/imageResize.ts`)→GAS `saveRepairPhotos_`(Drive 'SMC_수리사진', 링크공유)→시트 8열 URL. GAS `v18-repair-photos`.
- [x] **3) 렌탈 자산 구분** — 대시보드에 `RentalStatusPanel`(구매/렌탈 + 롯데렌탈/AJ네트웍스 집계) 추가. 상수 `AI→AJ네트웍스` 정정. GAS `buildDashboard_`에 acquisition/rentalByCompany 집계(`v12-rental`). 시트는 단일+`렌탈사` 컬럼 방식 유지(SSOT).
- [x] **4) 설정 모듈** — 사이드바 메뉴 표시/숨김 토글(`/admin/settings`). `app/moduleVisibility.ts`(localStorage 오버라이드 + 변경 이벤트) + `useModuleVisibility` 훅 → ModuleSidebar 반응. 대시보드·설정은 잠금(필수). 숨겨도 주소 접근은 가능. 서버(시트) 저장은 추후 확장 지점.
- [x] **5) 소모품 실데이터** — GAS `7_소모품목록` 시트(소모품명/현재고/적정재고/단위) 집계 → 대시보드 '소모품 재고 현황'(현재고<적정재고) + `stats.lowStockCount` 실연동. `v13-consumable`.
- [x] **6) 자산 대량 등록/폐기 + 바코드 일괄 출력** — 자산목록에 **체크박스 다중 선택**(`useAssetSelection`) + 하단 **대량 작업 바**(`AssetBulkBar`): ①라벨 일괄 인쇄(`printAssetLabels`, 라벨마다 1페이지) ②선택 폐기(`bulkDisposeAssets`, 순차 assetUpdate). **대량 등록**은 `AssetBulkRegisterModal`(편집 표, 자산명 있는 행만 `submitAssetRegisterBulk` 순차 등록). 로직은 `useAssetBulkActions` 훅으로 분리. 기존 GAS 재사용(재배포 불필요).
- [x] **7) 렌탈 비용/반납 관리** — 자산 시트에 **22월렌탈료·23계약시작·24계약종료·25반납일** 열 추가. 등록/수정 폼에 렌탈 비용 필드(취득=렌탈일 때), 상세 모달에 렌탈 정보 표시 + **'렌탈 반납'** 버튼(`rentalReturn` → 반납일 기록 + 3_변경로그 '비용지출 종료' 이력). 대시보드 렌탈 패널에 **월 렌탈 비용 총합/렌탈사별 비용**(진행중=반납·폐기 제외). GAS `v15-rental`.
- [x] **8) 반납/불출 히스토리 대시보드 연동** — `handleAssetUpdate_`가 **사용자 배정 변경**도 3_변경로그에 기록(`자산배정`: 홍길동→김춘향, 정운영→(반납)). `buildRecentChanges_`(최근 6건) → 대시보드 **'최근 이동'** 위젯(`RecentChangesPanel`, 반납/불출/상태변경/렌탈반납). GAS `v16-changelog`.
- [x] **9) 직원 소모품 신청 폼 + 총무팀 신청관리 화면** — `/request`에 소모품신청 탭(품목+기타·수량·사유) → `6_신청기록` 저장(consumableRequest). **총무팀 `/admin/requests`(신청관리)**: `?action=requests` 조회(useRequests, mock 폴백) + 종류 필터 탭 + 행 클릭 상세 모달에서 상태(접수/처리중/완료/반려)·처리방법(재고지급/구매요청/외부업체전달/기타)·메모 처리(`requestUpdate`, 시트 I~L열 갱신). GAS `v14-requests`.

> 클러스터: 소모품(5+9) · 렌탈(3+7+8) · 외부업체(2) · 설정(4) · 대량처리(6).

## 데이터 & 연동 메모

- 신청/등록 폼은 GAS로 **실제 저장**됨. 관리자 대시보드는 자산 시트를 **실집계**하고, 데이터 없는 섹션(신청/소모품/폐기)은 mock으로 폴백.
- **자산관리(`/admin/assets`)는 실데이터 연동 완료** — `?action=assets` 조회(useAssets, mock 폴백), 등록 시 자산번호 자동부여(`AST-YYYY-####`), 구매/렌탈 통합(취득구분·렌탈사·관리번호·키값) + 필터 탭 + **검색/정렬** + **행 클릭 상세보기·수정·상태변경·폐기 처리(assetUpdate)**.
- **자산 라벨 인쇄** — 자산 상세 모달 '라벨 인쇄' → 새 창에 **the SMC 로고(`public/logo.png`) + QR(자산번호) + 자산번호 텍스트** 라벨(**50×30mm**) 생성 후 인쇄. `qrcode`, `features/asset/labelPrint.ts`(`printAssetLabels`로 단건·일괄 통합, 라벨마다 1페이지). 로고 data URL 임베드(없으면 텍스트 폴백). 클라이언트 전용. (사용자 최종 선택: QR)
- **자산 대량 처리** — 목록 체크박스로 다중 선택 → 하단 작업 바에서 **라벨 일괄 인쇄** + **선택 폐기**(순차 assetUpdate, 이미 폐기 건 제외). **대량 등록**은 편집 표 모달(자산명 필수 행만 순차 assetRegister, 번호 자동발급). 새 등록분은 목록 새로고침 시 반영.
- **자산 코드 스캔 조회** — 자산 목록 '스캔'(카메라) → **Code128/QR 디코드** → 자산번호로 상세 모달 오픈. `html5-qrcode`(formatsToSupport: CODE_128+QR), `components/ui/QrScannerModal.tsx`. 카메라는 https/localhost에서만. (라벨 인쇄↔스캔 왕복 완성)
- **수리관리(`/admin/repair`)는 접수 목록 화면** — `?action=repairs` 조회(useRepairs, mock 폴백) + 요약카드, 수리 접수는 모달(기존 폼 재사용).
- **사용자관리(`/admin/users`)** — `?action=users` 조회(useUsers, mock 폴백) + `userRegister`/`userUpdate`. 사번(5_사용자목록 사번열) 기준 관리.
- **신청관리(`/admin/requests`)** — `?action=requests` 조회(useRequests, mock 폴백) + 종류 필터 + 상세 모달 처리(`requestUpdate` → `6_신청기록` I상태/J처리방법/K메모/L처리일시 갱신). rowIndex(시트 행번호)로 대상 식별. 종류: 자산신청/반납신청/소모품신청/**자산교체**(`constants/request.ts` REQUEST_KINDS — 필터 탭 자동 반영).
- **자산교체 신청** — 직원 `/request`의 **자산교체 탭**(`AssetSwapForm`): 기존 자산번호·자산명 + 교체희망 품목(Master 코드) + 교체사유(고장/노후/사양부족 등) → `assetSwapRequest`로 `6_신청기록`(종류=자산교체) 저장. 총무팀은 신청관리에서 동일하게 처리. (교체가 잦아 이력 남김)
- **GAS 코드 최신 `v20-master-codes` (⚠️재배포 필요) / 배포됨 `v19-org-settings`** — v20: 코드 Master(자산구분/렌탈사/소모품/제조사)를 `9_코드마스터` 시트 A1 JSON에 저장/조회(`masterCodes`, `masterCodesUpdate`, `buildMasterCodes_`, `handleMasterCodesUpdate_`). / v19: 조직 설정(부서/사용위치)을 `8_조직설정` 시트 A1 JSON에 저장/조회(`orgSettings`, `orgSettingsUpdate`, `buildOrgSettings_`, `handleOrgSettingsUpdate_`). / v18b: 수리신청 사진을 **사용자 지정 Drive 폴더(`REPAIR_PHOTO_FOLDER_ID`)** 에 저장, 시트 8열 이미지 URL(`saveRepairPhotos_`→`{urls,errors}`, `authorizeDrive`). **Drive 쓰기 권한 승인 필수(위 #2 함정).** + v17(조회 함수 시트 미생성) + 자산/수리/사용자/신청/외부업체/렌탈 + 최근이동.
  - 엔드포인트: assets·assetRegister·assetUpdate·rentalReturn / repairs·repairRequest(+이메일 접수확인)·repairUpdate·repairDispatch·vendorRepairs / users·userRegister·userUpdate / assetRequest·returnRequest·consumableRequest·**assetSwapRequest** / requests·requestUpdate / orgSettings·orgSettingsUpdate / masterCodes·masterCodesUpdate / **authSettings·authSettingsUpdate**
  - 시트: 1_수리접수기록 · 2_자산등록기록(+22월렌탈료·23계약시작·24계약종료·25반납일) · 3_변경로그(렌탈반납=비용지출 종료) · 5_사용자목록 · 6_신청기록 · 7_소모품목록 · 8_조직설정(A1=부서/위치 JSON) · 9_코드마스터(A1=코드 JSON) · 10_로그인설정(A1=비번 해시 JSON)
  - 직원 신청 저장, 외부업체 전달 필터, 총무팀 신청 처리, 렌탈 반납·월 비용 집계까지 구현됨. (실데이터는 v15 재배포 후 반영)
- **조직 설정(부서/사용위치)** — 회사 개편이 잦아 코드가 아닌 **설정 화면에서 관리**하고 **서버(시트 `8_조직설정`)에 저장 → 여러 기기/사용자 공유**. 기본값 `config/orgDefaults.ts`(본부→팀 + 사옥·층), 동기화 `app/orgSettings.ts`(서버 pull 1회 + 저장 시 push, localStorage는 캐시/폴백, 변경 이벤트) + `useOrgSettings` 훅. 모든 부서/위치 SelectField가 훅을 통해 최신값 사용. 편집 UI는 `features/settings/OrgSettingsSection`(저장 시 서버 반영·결과 alert). 타입은 `string`.
- **수리 접수 확인 메일** — 수리신청 폼에 **이메일 입력칸**(DetailStep) 추가. 접수 시 GAS가 입력 이메일로 접수확인 메일 발송(입력 없으면 `5_사용자목록`에서 이름으로 조회 폴백). 추후 Slack 봇 알림 확장 예정(`SLACK_WEBHOOK_URL`).
- **대시보드 바로가기(QuickLinks)** — 자산등록·QR출력→`/admin/assets`, 자산신청·소모품신청→`/admin/requests`, 유지보수신청→`/admin/repair`, 보고서조회→준비중(alert). `useNavigate`로 이동.
- **대시보드 실데이터 연동(v24)** — `buildDashboard_`가 **신청현황**(6_신청기록 최신 6건, `buildDashboardRequests_`)·**폐기예정**(상태=폐기예정 자산)도 실데이터로 반환. `useDashboardData`는 **실데이터 모드에서 mock을 섞지 않고**(과거엔 빈 섹션을 mock으로 대체해 가짜가 보였음) 빈 섹션은 빈 상태 표시. `RequestStatusPanel`/`DisposalScheduleTable` 상태 뱃지 관대 처리(문자열 타입)+빈 상태.
- **알림 벨(TopBar)** — 실제 `6_신청기록`의 '접수' 건을 뱃지·목록으로 표시(`useRequests`), 항목/‘모두 보기’ 클릭 시 `/admin/requests` 이동.
- **자산 검색** — 자산번호(숫자 방어 String 변환)·자산명·사용자·관리번호·제조사·모델·시리얼·부서·구분·위치 대상으로 부분일치 검색.
- **코드(Master) 관리** — 자산구분·렌탈사·소모품 품목·제조사 선택지를 `/admin/master`에서 관리하고 **서버(시트 `9_코드마스터` A1 JSON)에 저장 → 여러 기기 공유**. 기본값 `config/masterDefaults.ts`(기존 `constants/`를 시드), 동기화 `app/masterCodes.ts`(pull 1회+push, localStorage 캐시) + `useMasterCodes` 훅. 폼 셀렉트(BasicInfo 자산구분·제조사 / Acquisition 렌탈사 / AssetBulkRegister / AssetRequest / ConsumableRequest)가 훅으로 최신값 사용. **자산상태·수리 우선순위/진행상태는 뱃지 Record와 묶여 코드 고정**(편집 대상 아님). `TextInput`에 datalist(`options`) 지원 추가.
- **소모품 품목 선택지** — 기본값 `constants/consumable.ts`(복합기_카트리지/PC_키보드·마우스·HDMI·DVI+HDMI·노트북어댑터·모니터어댑터/기타). 실제 선택지는 Master(`9_코드마스터`)에서 관리, 실재고는 시트 `7_소모품목록`.
- **자산장부 이관** — 3개 장부(롯데렌탈/AJ네트웍스/전체자산)를 `2_자산등록기록` 한 시트로 합쳐 넣음. 열 매핑·주의사항은 [docs/ASSET_LEDGER_IMPORT.md](docs/ASSET_LEDGER_IMPORT.md).
- **로그인 화면** — 좌측 로그인 카드 / 우측 배경 영상(`public/videos/login_bg.mp4`) 좌우 분할, 모바일은 세로 스택. 영상은 **720p·오디오 제거·faststart로 재인코딩(2.3MB)**, `AuthGate`에서 `videoRef`로 muted 강제+`play()` 호출해 자동재생 보장(무음·반복). 파일 없으면 그라데이션 폴백. (기존 `main_video.mp4` 삭제됨) · 인코딩 도구: 로컬 ffmpeg(winget `Gyan.FFmpeg`) 설치됨.
- Google Apps Script는 정적 호스팅(GitHub Pages)이 못 하는 서버 작업(시트 저장/Slack/메일)을 담당.
- `GAS_URL`은 `src/config/api.ts`에 설정. `.env`의 `VITE_API_TOKEN`으로 요청 검증(서버 `API_TOKEN`과 일치 필요).
- Slack Webhook URL / Gmail 발송은 `Code.gs` 내부 설정(프론트에 미노출).

## 커밋 히스토리 컨벤션 예시

```
feat: 관리자 대시보드 화면 구현 (이미지 4)
chore: TypeScript 전환 및 프로젝트 기반 세팅
fix: useForm 제네릭 제약 완화
```
