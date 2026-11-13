/**
 * IT 자산관리 - Google Apps Script 백엔드
 * ------------------------------------------------------------
 * 역할: 프론트엔드(GitHub Pages)에서 받은 신청/등록 데이터를
 *       구글시트에 저장하고, Slack 알림 + 메일 자동회신을 보냅니다.
 *
 * 배포: [배포] > [새 배포] > 유형 '웹 앱'
 *   - 실행 계정: 나
 *   - 액세스 권한: 모든 사용자(Anyone)
 *   발급된 웹앱 URL을 프론트엔드 src/config/api.ts 의 GAS_URL 에 넣습니다.
 */

// ===== 설정 (사용 환경에 맞게 수정) =====

/**
 * 요청 검증용 공유 토큰.
 * 코드에 직접 쓰지 않고 **스크립트 속성(Script Properties)** 에서 읽습니다.
 * → 코드를 다시 붙여넣어도 토큰이 사라지지 않습니다(반복되던 문제 해결).
 *
 * 설정(최초 1회): [프로젝트 설정] → [스크립트 속성] → 속성 추가
 *   속성: API_TOKEN / 값: 프론트엔드 .env의 VITE_API_TOKEN과 동일 값
 * 비워두면 토큰 검증을 건너뜁니다(모든 요청 허용).
 */
var API_TOKEN = PropertiesService.getScriptProperties().getProperty('API_TOKEN') || ''

/** Slack Incoming Webhook URL. 비우면 Slack 알림을 건너뜁니다. */
var SLACK_WEBHOOK_URL = ''

/** 수리 접수 알림을 받을 총무팀(관리자) 이메일(=받는사람). 비우면 관리자 알림을 건너뜁니다. */
var ADMIN_EMAIL = 'general_affairs@thesmc.co.kr'

/**
 * 메일 보낸사람(From) 주소/이름.
 * ⚠️ `SENDER_EMAIL`이 From으로 실제 적용되려면, 스크립트 소유 Gmail 계정의
 *    [설정]→[계정]→[다른 주소에서 메일 보내기(Send mail as)]에 이 주소가 등록·인증돼 있어야 합니다.
 *    등록 안 돼 있으면 자동으로 기존 계정 주소로 발송됩니다(sendMail_의 폴백).
 */
var SENDER_EMAIL = 'general_affairs@thesmc.co.kr'
var SENDER_NAME = '총무팀'

// (슬랙 챗봇·Gemini 설정은 제거됨 — 슬랙 1:1 DM 챗봇은 별도 Python 봇(Socket Mode + Claude)으로 이전.
//  FAQ는 이 GAS가 계속 제공: GET ?action=faq / POST faqUpdate, 시트 11_FAQ. 웹앱 'FAQ/챗봇' 화면에서 편집.)

/**
 * 수리 사진을 저장할 Google Drive 폴더 ID.
 * 사용자가 직접 만들어 **공유 설정(링크가 있는 사용자 보기 등)**을 지정한 폴더를 씁니다.
 * → 코드가 자동으로 공개 설정하지 않아도 되고, 도메인 외부공유 정책 이슈를 피할 수 있음.
 * 비우면 'SMC_수리사진' 폴더를 자동 생성해 사용합니다.
 */
var REPAIR_PHOTO_FOLDER_ID = '1SQvcRRHQusU6JaIRwF-pd1EiHAKsEYqf'

/** 시트 탭 이름. */
var SHEET_REPAIR = '1_수리접수기록'
var SHEET_ASSET = '2_자산등록기록'
var SHEET_LOG = '3_변경로그'
var SHEET_USER = '5_사용자목록'
var SHEET_REQUEST = '6_신청기록'
var SHEET_CONSUMABLE = '7_소모품목록' // 열: 소모품명 / 현재고 / 적정재고 / 단위 (IT 소모품)
var SHEET_ORG = '8_조직설정' // A1 셀에 {divisions, locations} JSON 저장(부서/사용위치)
var SHEET_MASTER = '9_코드마스터' // A1 셀에 {categories, rentalCompanies, consumables, manufacturers} JSON
var SHEET_AUTH = '10_로그인설정' // A1 셀에 {admin, employee, vendor} 비밀번호 SHA-256 해시 JSON(오버라이드)
var SHEET_FAQ = '11_FAQ' // 행: 질문 / 답변 / 키워드 (슬랙 챗봇 1차 대응용, 총무팀 편집)

// ===== 진입점 =====

/**
 * 프론트엔드의 POST 요청을 처리합니다.
 * @param {GoogleAppsScript.Events.DoPost} e - 요청 이벤트
 * @return {GoogleAppsScript.Content.TextOutput} JSON 응답
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)

    // 토큰이 설정된 경우, 일치하지 않는 요청은 거부합니다(무단 쓰기 차단).
    if (API_TOKEN && body.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }

    var type = body.type
    var payload = body.payload || {}

    if (type === 'assetRegister') return jsonOutput_(handleAssetRegister_(payload))
    if (type === 'assetUpdate') return jsonOutput_(handleAssetUpdate_(payload))
    if (type === 'rentalReturn') return jsonOutput_(handleRentalReturn_(payload))
    if (type === 'repairRequest') return jsonOutput_(handleRepairRequest_(payload))
    if (type === 'repairUpdate') return jsonOutput_(handleRepairUpdate_(payload))
    if (type === 'repairDispatch') return jsonOutput_(handleRepairDispatch_(payload))
    if (type === 'userRegister') return jsonOutput_(handleUserRegister_(payload))
    if (type === 'userUpdate') return jsonOutput_(handleUserUpdate_(payload))
    if (type === 'assetRequest') return jsonOutput_(handleAssetRequest_(payload))
    if (type === 'returnRequest') return jsonOutput_(handleReturnRequest_(payload))
    if (type === 'consumableRequest') return jsonOutput_(handleConsumableRequest_(payload))
    if (type === 'assetSwapRequest') return jsonOutput_(handleAssetSwapRequest_(payload))
    if (type === 'requestUpdate') return jsonOutput_(handleRequestUpdate_(payload))
    if (type === 'orgSettingsUpdate') return jsonOutput_(handleOrgSettingsUpdate_(payload))
    if (type === 'masterCodesUpdate') return jsonOutput_(handleMasterCodesUpdate_(payload))
    if (type === 'authSettingsUpdate') return jsonOutput_(handleAuthSettingsUpdate_(payload))
    if (type === 'faqUpdate') return jsonOutput_(handleFaqUpdate_(payload))
    return jsonOutput_({ ok: false, message: '알 수 없는 요청 유형: ' + type })
  } catch (err) {
    return jsonOutput_({ ok: false, message: String(err) })
  }
}

/**
 * GET 핸들러. `?action=dashboard`면 대시보드 집계를, 아니면 헬스체크를 반환합니다.
 * @param {GoogleAppsScript.Events.DoGet} e - 요청 이벤트
 * @return {GoogleAppsScript.Content.TextOutput} JSON 응답
 */
function doGet(e) {
  var params = (e && e.parameter) || {}

  if (params.action === 'dashboard') {
    // 대시보드 조회에도 동일 토큰 검증 적용
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, dashboard: buildDashboard_() })
  }

  if (params.action === 'assets') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, assets: buildAssets_() })
  }

  if (params.action === 'repairs') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, repairs: buildRepairs_() })
  }

  if (params.action === 'users') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, users: buildUsers_() })
  }

  if (params.action === 'requests') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, requests: buildRequests_() })
  }

  if (params.action === 'vendorRepairs') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    // 외부업체는 '전달된' 수리 건만 조회 가능. 완료 처리된 건은 목록에서 제외(시트에는 '완료'로 남음).
    return jsonOutput_({
      ok: true,
      repairs: buildRepairs_().filter(function (r) {
        return r.dispatched && r.status !== '완료'
      }),
    })
  }

  if (params.action === 'orgSettings') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, org: buildOrgSettings_() })
  }

  if (params.action === 'masterCodes') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, codes: buildMasterCodes_() })
  }

  if (params.action === 'authSettings') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, auth: buildAuthSettings_() })
  }

  if (params.action === 'faq') {
    if (API_TOKEN && params.token !== API_TOKEN) {
      return jsonOutput_({ ok: false, message: '인증 실패(토큰 불일치)' })
    }
    return jsonOutput_({ ok: true, faq: buildFaq_() })
  }

  return jsonOutput_({
    ok: true,
    message: 'IT 자산관리 백엔드 정상 동작 중',
    version: 'v44-repair-revert',
    tokenEnabled: !!API_TOKEN,
  })
}

/**
 * 사용자목록 시트를 목록(UserRow[])으로 변환합니다.
 * 열: 0사번 1이름 2본부 3부서 4직급 5이메일 (본부열을 부서 왼쪽에 추가)
 * @return {Object[]} 사용자 목록
 */
function buildUsers_() {
  var sheet = getSheetOrNull_(SHEET_USER)
  if (!sheet) return [] // 시트가 없으면 생성하지 않고 빈 목록 반환(중복 생성 방지)
  var rows = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[0] && !r[1]) continue
    out.push({
      id: String(r[0] || ''),
      name: r[1] || '',
      division: r[2] || '', // 2 본부
      department: r[3] || '', // 3 부서
      position: r[4] || '', // 4 직급
      email: r[5] || '', // 5 이메일
    })
  }
  return out
}

/**
 * 사용자를 시트에 추가합니다. (사번 중복 시 거부)
 * @param {Object} p - { id, name, department, position, email }
 * @return {Object} 처리 결과
 */
function handleUserRegister_(p) {
  var sheet = getSheet_(SHEET_USER)
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(p.id) && p.id) {
      return { ok: false, message: '이미 존재하는 사번입니다: ' + p.id }
    }
  }
  appendRow_(SHEET_USER, [p.id, p.name, p.division || '', p.department, p.position, p.email])
  return { ok: true }
}

/**
 * 사용자 정보를 수정합니다. (사번으로 행을 찾아 이름/부서/직급/이메일 갱신)
 * @param {Object} p - { id, name, department, position, email }
 * @return {Object} 처리 결과
 */
function handleUserUpdate_(p) {
  var sheet = getSheet_(SHEET_USER)
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) !== String(p.id)) continue
    var row = i + 1
    sheet.getRange(row, 2).setValue(p.name || '') //       1 이름
    sheet.getRange(row, 3).setValue(p.division || '') //   2 본부
    sheet.getRange(row, 4).setValue(p.department || '') // 3 부서
    sheet.getRange(row, 5).setValue(p.position || '') //   4 직급
    sheet.getRange(row, 6).setValue(p.email || '') //      5 이메일
    return { ok: true }
  }
  return { ok: false, message: '사번을 찾을 수 없습니다: ' + p.id }
}

/**
 * 자산 신청(직원)을 신청기록 시트에 저장합니다.
 * 열: 신청일시 / 종류 / 신청자 / 부서 / 자산번호 / 자산명(대상) / 사유 / 상세 / 상태
 * @param {Object} p - { requester, department, category, spec, reason, wantDate }
 * @return {Object} 처리 결과
 */
function handleAssetRequest_(p) {
  var now = stamp_() // 시트에 날짜만(시각 제외) 기록
  var detail = p.spec || ''
  if (p.wantDate) detail += (detail ? ' / ' : '') + '희망일 ' + p.wantDate
  appendRow_(SHEET_REQUEST, [
    now,
    '자산신청',
    p.requester,
    p.department,
    '',
    p.category,
    p.reason,
    detail,
    '접수',
    '', // 9 처리방법(총무팀)
    '', // 10 처리메모
    '', // 11 처리일시
    p.email || '', // 12 이메일
    p.location || '', // 13 현재 위치
  ])
  notifySlack_('📝 *자산 신청* ' + (p.requester || '') + ' / ' + (p.category || ''))
  notifyRequestEmails_('자산신청', p, '품목: ' + (p.category || '') + '\n사유: ' + (p.reason || '') + (detail ? '\n상세: ' + detail : ''))
  return { ok: true }
}

/**
 * 반납 신청(직원)을 신청기록 시트에 저장합니다.
 * @param {Object} p - { requester, department, assetNumber, assetName, reason, note }
 * @return {Object} 처리 결과
 */
function handleReturnRequest_(p) {
  var now = stamp_() // 시트에 날짜만(시각 제외) 기록
  appendRow_(SHEET_REQUEST, [
    now,
    '반납신청',
    p.requester,
    p.department,
    p.assetNumber,
    p.assetName,
    p.reason,
    p.note,
    '접수',
    '', // 9 처리방법
    '', // 10 처리메모
    '', // 11 처리일시
    p.email || '', // 12 이메일
    p.location || '', // 13 현재 위치
  ])
  notifySlack_('📦 *반납 신청* ' + (p.requester || '') + ' / ' + (p.assetNumber || ''))
  notifyRequestEmails_('반납신청', p, '자산번호: ' + (p.assetNumber || '') + '\n자산명: ' + (p.assetName || '') + '\n사유: ' + (p.reason || '') + (p.note ? '\n비고: ' + p.note : ''))
  return { ok: true }
}

/**
 * 소모품 신청(직원)을 신청기록 시트에 저장합니다.
 * 열: 신청일시 / 종류 / 신청자 / 부서 / (자산번호=빈칸) / 소모품명 / 사유 / 수량 / 상태
 * @param {Object} p - { requester, department, item, qty, reason }
 * @return {Object} 처리 결과
 */
function handleConsumableRequest_(p) {
  var now = stamp_() // 시트에 날짜만(시각 제외) 기록
  appendRow_(SHEET_REQUEST, [
    now,
    '소모품신청',
    p.requester,
    p.department,
    '',
    p.item,
    p.reason,
    '수량 ' + (p.qty || ''),
    '접수',
    '', // 9 처리방법
    '', // 10 처리메모
    '', // 11 처리일시
    p.email || '', // 12 이메일
    p.location || '', // 13 현재 위치
  ])
  notifySlack_('🧴 *소모품 신청* ' + (p.requester || '') + ' / ' + (p.item || '') + ' ' + (p.qty || ''))
  notifyRequestEmails_('소모품신청', p, '품목: ' + (p.item || '') + '\n수량: ' + (p.qty || '') + '\n사유: ' + (p.reason || ''))
  return { ok: true }
}

/**
 * 자산 교체 신청(직원)을 신청기록 시트에 저장합니다.
 * 열: 신청일시 / 종류(자산교체) / 신청자 / 부서 / (기존)자산번호 / (기존)자산명 / 사유 / 상세 / 상태
 * @param {Object} p - { requester, department, assetNumber, assetName, category, reason, note }
 * @return {Object} 처리 결과
 */
function handleAssetSwapRequest_(p) {
  var now = stamp_() // 시트에 날짜만(시각 제외) 기록
  var detail = ''
  if (p.category) detail += '교체희망: ' + p.category
  if (p.note) detail += (detail ? ' / ' : '') + p.note
  appendRow_(SHEET_REQUEST, [
    now,
    '자산교체',
    p.requester,
    p.department,
    p.assetNumber,
    p.assetName,
    p.reason,
    detail,
    '접수',
    '', // 9 처리방법
    '', // 10 처리메모
    '', // 11 처리일시
    p.email || '', // 12 이메일
    p.location || '', // 13 현재 위치
  ])
  notifySlack_('🔁 *자산 교체 신청* ' + (p.requester || '') + ' / ' + (p.assetNumber || '') + ' ' + (p.reason || ''))
  notifyRequestEmails_('자산교체', p, '기존 자산번호: ' + (p.assetNumber || '') + '\n기존 자산명: ' + (p.assetName || '') + '\n교체희망: ' + (p.category || '') + '\n사유: ' + (p.reason || '') + (p.note ? '\n비고: ' + p.note : ''))
  return { ok: true }
}

/**
 * 직원 신청(자산/소모품/반납/교체) 접수 시 메일 2종을 보냅니다.
 *  (1) 총무팀(ADMIN_EMAIL)에게 접수 알림
 *  (2) 신청자에게 접수확인 — 폼에 적은 이메일 우선, 없으면 사용자목록에서 이름으로 조회
 * ※ 수리신청은 handleRepairRequest_에서 별도(접수번호 포함) 발송하므로 여기서 제외.
 * @param {string} kind - 신청 종류 표기(예: '자산신청')
 * @param {Object} p - 신청 payload (requester, department, email, location 등)
 * @param {string} detail - 메일 본문에 넣을 요약(품목/수량/사유 등, 줄바꿈 포함)
 * @return {void}
 */
function notifyRequestEmails_(kind, p, detail) {
  var requester = p.requester || ''
  // (1) 총무팀 접수 알림
  if (ADMIN_EMAIL) {
    sendMail_(
      ADMIN_EMAIL,
      '[자산관리] 새 ' + kind + ' 접수',
      '새 ' + kind + '이(가) 접수되었습니다.\n\n' +
        '신청자: ' + requester + ' (' + (p.department || '') + ')\n' +
        '이메일: ' + (p.email || '') + '\n' +
        '현재 위치: ' + (p.location || '') + '\n' +
        detail + '\n\n' +
        '신청관리 화면에서 확인해 주세요.'
    )
  }
  // (2) 신청자 접수확인 — 유효한 이메일(@ 포함)만, 없으면 이름으로 조회
  var email = p.email && String(p.email).indexOf('@') !== -1 ? p.email : lookupEmailByName_(requester)
  if (email) {
    sendMail_(
      email,
      '[자산관리] ' + kind + '이(가) 접수되었습니다',
      '안녕하세요 ' + requester + '님,\n\n' +
        kind + '이(가) 정상 접수되었습니다.\n' +
        detail + '\n\n' +
        '총무팀이 확인 후 처리해 드리겠습니다. 감사합니다.'
    )
  }
}

/**
 * 신청기록 시트를 총무팀 신청관리 목록(RequestRow[])으로 변환합니다. (최신 신청 먼저)
 * 열: 0신청일시 1종류 2신청자 3부서 4자산번호 5대상명 6사유 7상세 8상태
 *     9처리방법 10처리메모 11처리일시
 * rowIndex(시트 실제 행번호)를 함께 반환해 requestUpdate가 해당 행을 갱신합니다.
 * @return {Object[]} 신청 목록
 */
function buildRequests_() {
  var sheet = getSheetOrNull_(SHEET_REQUEST)
  if (!sheet) return []
  var rows = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[1] && !r[2]) continue // 종류·신청자 모두 없으면 빈 행
    out.push({
      rowIndex: i + 1, // 시트 실제 행번호(1-based, 헤더 포함)
      requestedAt: formatDateCell_(r[0]),
      kind: r[1] || '',
      requester: r[2] || '',
      department: r[3] || '',
      assetNumber: r[4] || '',
      target: r[5] || '',
      reason: r[6] || '',
      detail: r[7] || '',
      status: r[8] || '접수',
      method: r[9] || '',
      note: r[10] || '',
      processedAt: formatDateCell_(r[11]),
      email: r[12] || '', // 12 이메일
      location: r[13] || '', // 13 현재 위치
    })
  }
  return out.reverse()
}

/**
 * 신청 건의 처리 상태/방법/메모를 갱신합니다. (총무팀 전용)
 * 열 I(상태)·J(처리방법)·K(처리메모)·L(처리일시)를 씁니다.
 * @param {Object} p - { rowIndex, status, method, note }
 * @return {Object} 처리 결과
 */
function handleRequestUpdate_(p) {
  var row = Number(p.rowIndex)
  if (!row || row < 2) return { ok: false, message: '유효하지 않은 행 번호입니다.' }
  var sheet = getSheet_(SHEET_REQUEST)
  if (row > sheet.getLastRow()) return { ok: false, message: '존재하지 않는 신청입니다.' }
  // I=9열(상태), J=10열(처리방법), K=11열(처리메모), L=12열(처리일시)
  sheet.getRange(row, 9).setValue(p.status || '접수')
  sheet.getRange(row, 10).setValue(p.method || '')
  sheet.getRange(row, 11).setValue(p.note || '')
  sheet.getRange(row, 12).setValue(stamp_()) // 처리일시: 날짜만(시각 제외)
  return { ok: true }
}

/**
 * 조직 설정(부서/사용위치)을 조회합니다. `8_조직설정` 시트 A1 셀의 JSON을 파싱합니다.
 * @return {Object|null} { divisions: [{name, teams}], locations: [] } 또는 데이터 없으면 null
 */
function buildOrgSettings_() {
  var sheet = getSheetOrNull_(SHEET_ORG)
  if (!sheet) return null
  var raw = sheet.getRange(1, 1).getValue()
  if (!raw) return null
  try {
    return JSON.parse(String(raw))
  } catch (err) {
    return null
  }
}

/**
 * 조직 설정(부서/사용위치)을 저장합니다. `8_조직설정` A1 셀에 JSON으로 씁니다.
 * (관리자가 설정 화면에서 저장하면 모든 기기/사용자가 공유)
 * @param {Object} p - { divisions: [{name, teams}], locations: [] }
 * @return {Object} 처리 결과
 */
function handleOrgSettingsUpdate_(p) {
  var sheet = getSheet_(SHEET_ORG)
  var payload = { divisions: p.divisions || [], locations: p.locations || [] }
  sheet.getRange(1, 1).setValue(JSON.stringify(payload))
  return { ok: true }
}

/**
 * 코드(Master)를 조회합니다. `9_코드마스터` 시트 A1 셀의 JSON을 파싱합니다.
 * @return {Object|null} { categories, rentalCompanies, consumables, manufacturers } 또는 null
 */
function buildMasterCodes_() {
  var sheet = getSheetOrNull_(SHEET_MASTER)
  if (!sheet) return null
  var raw = sheet.getRange(1, 1).getValue()
  if (!raw) return null
  try {
    return JSON.parse(String(raw))
  } catch (err) {
    return null
  }
}

/**
 * 코드(Master)를 저장합니다. `9_코드마스터` A1 셀에 JSON으로 씁니다.
 * @param {Object} p - { categories, rentalCompanies, consumables, manufacturers }
 * @return {Object} 처리 결과
 */
function handleMasterCodesUpdate_(p) {
  var sheet = getSheet_(SHEET_MASTER)
  var payload = {
    categories: p.categories || [],
    rentalCompanies: p.rentalCompanies || [],
    consumables: p.consumables || [],
    manufacturers: p.manufacturers || [],
  }
  sheet.getRange(1, 1).setValue(JSON.stringify(payload))
  return { ok: true }
}

/**
 * 로그인 비밀번호 해시(오버라이드)를 조회합니다. `10_로그인설정` A1 JSON.
 * 평문은 저장하지 않고 SHA-256 해시만 저장합니다. (설정 안 한 역할은 프론트 기본값 사용)
 * @return {Object|null} { admin?, employee?, vendor? } 해시맵 또는 null
 */
function buildAuthSettings_() {
  var sheet = getSheetOrNull_(SHEET_AUTH)
  if (!sheet) return null
  var raw = sheet.getRange(1, 1).getValue()
  if (!raw) return null
  try {
    return JSON.parse(String(raw))
  } catch (err) {
    return null
  }
}

/**
 * 로그인 비밀번호 해시(오버라이드)를 저장합니다. `10_로그인설정` A1 JSON.
 * @param {Object} p - { admin?, employee?, vendor? } (각 값은 SHA-256 해시 문자열)
 * @return {Object} 처리 결과
 */
function handleAuthSettingsUpdate_(p) {
  var sheet = getSheet_(SHEET_AUTH)
  var payload = {}
  if (p.admin) payload.admin = p.admin
  if (p.employee) payload.employee = p.employee
  if (p.vendor) payload.vendor = p.vendor
  // guestEnabled: 비밀번호 없이 입장 허용 토글(불리언). false도 보존해야 하므로 undefined만 제외.
  if (typeof p.guestEnabled !== 'undefined') payload.guestEnabled = !!p.guestEnabled
  sheet.getRange(1, 1).setValue(JSON.stringify(payload))
  return { ok: true }
}

/**
 * FAQ(예상질문/답변)를 조회합니다. `11_FAQ` 시트 행: 0질문 1답변 2키워드 (1행=헤더).
 * @return {Object[]} [{ question, answer, keywords }]
 */
function buildFaq_() {
  var sheet = getSheetOrNull_(SHEET_FAQ)
  if (!sheet) return []
  var rows = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[0] && !r[1]) continue // 질문·답변 모두 없으면 빈 행
    out.push({ question: r[0] || '', answer: r[1] || '', keywords: r[2] || '' })
  }
  return out
}

/**
 * FAQ 목록을 통째로 저장합니다. (총무팀 FAQ 편집 → 시트 전체 재작성)
 * @param {Object} p - { items: [{ question, answer, keywords }] }
 * @return {Object} 처리 결과
 */
function handleFaqUpdate_(p) {
  var sheet = getSheet_(SHEET_FAQ)
  var items = p.items || []
  sheet.clearContents()
  var rows = [['질문', '답변', '키워드']]
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {}
    rows.push([it.question || '', it.answer || '', it.keywords || ''])
  }
  sheet.getRange(1, 1, rows.length, 3).setValues(rows)
  return { ok: true }
}

/**
 * 수리접수 시트를 목록(RepairRow[])으로 변환합니다. (최신 접수 먼저)
 * 열: 0접수일시 1접수번호 2접수자 3부서 4자산번호 5자산명 6증상 7우선순위 8첨부 9상태 10담당자 11완료일
 * @return {Object[]} 수리 접수 목록
 */
function buildRepairs_() {
  var sheet = getSheetOrNull_(SHEET_REPAIR)
  if (!sheet) return []
  var rows = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[1] && !r[6]) continue
    out.push({
      ticketNumber: r[1] || '',
      receivedAt: formatDateCell_(r[0]),
      requester: r[2] || '',
      department: r[3] || '',
      assetNumber: r[4] || '',
      assetName: r[5] || '',
      symptom: r[6] || '',
      priority: r[7] || '보통',
      status: r[9] || '접수',
      assignee: r[10] || '',
      dispatched: !!r[12], // 12: 외부업체 전달 여부(총무팀만 설정)
      attachments: r[8] || '', // 8: 첨부 사진 파일명(쉼표 구분)
      email: r[13] || '', // 13: 접수자 이메일
      location: r[14] || '', // 14: 현재 위치
    })
  }
  return out.reverse()
}

/**
 * 자산등록 시트를 자산 목록(AssetRow[])으로 변환합니다. (최신 등록 먼저)
 * @return {Object[]} 자산 목록
 */
function buildAssets_() {
  var sheet = getSheetOrNull_(SHEET_ASSET)
  if (!sheet) return []
  var rows = sheet.getDataRange().getValues()
  var out = []
  // 열: 0등록일시 1자산번호 2자산명 3구분 4제조사 5모델 6시리얼 7취득일 8금액
  //     9사용자 10위치 11상태 12비고 13관리번호 14키값 15취득구분 16렌탈사
  //     17부서 18구매처 19보증 20관리담당자 21폐기일
  //     22월렌탈료 23계약시작 24계약종료 25반납일
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[1] && !r[2]) continue
    out.push({
      assetNumber: r[1] || '',
      name: r[2] || '',
      category: r[3] || '기타',
      manufacturer: r[4] || '',
      model: r[5] || '',
      serialNumber: r[6] || '',
      acquiredDate: formatDateCell_(r[7]),
      purchaseAmount: r[8] === '' || r[8] == null ? '' : String(r[8]),
      user: r[9] || '',
      location: r[10] || '',
      status: r[11] || '사용중',
      note: r[12] || '',
      managementNumber: r[13] || '',
      keyValue: r[14] || '',
      acquisitionType: r[15] || '구매',
      rentalCompany: r[16] || '',
      department: r[17] || '',
      vendor: r[18] || '',
      warrantyUntil: formatDateCell_(r[19]),
      manager: r[20] || '',
      disposalDate: formatDateCell_(r[21]),
      monthlyRent: r[22] === '' || r[22] == null ? '' : String(r[22]),
      contractStart: formatDateCell_(r[23]),
      contractEnd: formatDateCell_(r[24]),
      returnDate: formatDateCell_(r[25]),
    })
  }
  return out.reverse()
}

/**
 * 자산등록 시트를 집계해 대시보드 데이터를 만듭니다.
 * (신청현황/소모품/폐기 예정은 별도 시트가 생기기 전까지 빈 배열 → 프론트가 mock으로 채움)
 * @return {Object} 대시보드 데이터
 */
function buildDashboard_() {
  var assetSheet = getSheetOrNull_(SHEET_ASSET)
  var rows = assetSheet ? assetSheet.getDataRange().getValues() : []
  var categoryMap = {}
  var stats = { totalAssets: 0, inUseAssets: 0, repairingAssets: 0, disposalPlannedAssets: 0, lowStockCount: 0 }
  var acquisition = { purchase: 0, rental: 0 }
  var rentalMap = {}
  var rentalCostMap = {} // 렌탈사별 월 렌탈료 합계(진행중만)
  var rentalMonthlyTotal = 0 // 진행중 렌탈 월 비용 총합
  var recent = []
  var disposals = [] // 폐기예정 자산

  // 열: 0등록일시 1자산번호 2자산명 3구분 ... 9사용자 10위치 11상태 ... 15취득구분 16렌탈사
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[1] && !r[2]) continue // 빈 행 스킵
    stats.totalAssets++
    var category = r[3] || '기타'
    categoryMap[category] = (categoryMap[category] || 0) + 1
    var status = r[11]
    if (status === '사용중') stats.inUseAssets++
    else if (status === '수리중') stats.repairingAssets++
    else if (status === '폐기예정') {
      stats.disposalPlannedAssets++
      disposals.push({
        assetNumber: String(r[1] || ''),
        name: r[2] || '',
        acquiredDate: formatDateCell_(r[7]),
        disposalDate: formatDateCell_(r[21]), // 21 폐기일(예정일)
      })
    }

    // 취득 구분(구매/렌탈) + 렌탈사 집계 + 월 렌탈 비용(진행중만)
    if (r[15] === '렌탈') {
      acquisition.rental++
      var company = r[16] || '기타'
      rentalMap[company] = (rentalMap[company] || 0) + 1
      // 반납일(25)이 없고 폐기가 아니면 '진행중' → 월 렌탈료 비용 합산
      var active = !r[25] && status !== '폐기'
      if (active) {
        var rent = Number(r[22]) || 0
        rentalCostMap[company] = (rentalCostMap[company] || 0) + rent
        rentalMonthlyTotal += rent
      }
    } else {
      acquisition.purchase++
    }

    recent.push({
      assetNumber: r[1],
      name: r[2],
      category: category,
      acquiredDate: formatDateCell_(r[7]),
      user: r[9] || '-',
      status: status || '사용중',
    })
  }

  var categories = []
  for (var key in categoryMap) categories.push({ category: key, count: categoryMap[key] })
  var rentalByCompany = []
  for (var c in rentalMap) rentalByCompany.push({ company: c, count: rentalMap[c], cost: rentalCostMap[c] || 0 })

  // 소모품 재고 부족(7_소모품목록: 0소모품명 1현재고 2적정재고 3단위) — 현재고 < 적정재고
  var lowStock = []
  var consumableSheet = getSheetOrNull_(SHEET_CONSUMABLE)
  var crows = consumableSheet ? consumableSheet.getDataRange().getValues() : []
  for (var j = 1; j < crows.length; j++) {
    var cr = crows[j]
    if (!cr[0]) continue
    var cur = Number(cr[1]) || 0
    var th = Number(cr[2]) || 0
    if (cur < th) lowStock.push({ name: cr[0], currentStock: cur, threshold: th, unit: cr[3] || '개' })
  }
  stats.lowStockCount = lowStock.length

  return {
    stats: stats,
    categories: categories,
    acquisition: acquisition,
    rentalByCompany: rentalByCompany,
    rentalMonthlyTotal: rentalMonthlyTotal,
    recentAssets: recent.slice(-5).reverse(), // 최근 5건
    recentChanges: buildRecentChanges_(6), // 최근 이동(반납/불출/상태) 6건
    requests: buildDashboardRequests_(6), // 신청현황(6_신청기록 최신 6건)
    lowStock: lowStock,
    disposals: disposals,
  }
}

/**
 * 신청기록(6_신청기록) 최신 N건을 대시보드 '신청 현황' 형태로 반환합니다.
 * 열: 0신청일시 1종류 2신청자 3부서 4자산번호 5대상명 6사유 7상세 8상태
 * @param {number} limit - 최대 건수
 * @return {Object[]} { kind, title, date, status }
 */
function buildDashboardRequests_(limit) {
  var sheet = getSheetOrNull_(SHEET_REQUEST)
  if (!sheet) return []
  var rows = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[1] && !r[2]) continue // 종류·신청자 모두 없으면 빈 행
    var who = r[2] || ''
    var target = r[5] || r[6] || ''
    out.push({
      kind: r[1] || '신청',
      title: who + (target ? ' · ' + target : ''),
      date: formatDateCell_(r[0]),
      status: r[8] || '접수',
    })
  }
  return out.reverse().slice(0, limit)
}

/**
 * 변경로그(3_변경로그)에서 최근 이동/변경 이력을 최신순으로 반환합니다.
 * 열: 0일시 1구분 2담당자 3대상(자산번호) 4필드 5이전 6이후 7메모
 * @param {number} limit - 최대 건수
 * @return {Object[]} 최근 변경 이력
 */
function buildRecentChanges_(limit) {
  var sheet = getSheetOrNull_(SHEET_LOG)
  if (!sheet) return []
  var rows = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i]
    if (!r[1] && !r[3]) continue // 구분·대상 모두 없으면 빈 행
    out.push({
      at: formatDateCell_(r[0]),
      kind: r[1] || '',
      actor: r[2] || '',
      target: r[3] || '',
      field: r[4] || '',
      before: r[5] === '' || r[5] == null ? '' : String(r[5]),
      after: r[6] === '' || r[6] == null ? '' : String(r[6]),
      note: r[7] || '',
    })
  }
  return out.reverse().slice(0, limit)
}

/**
 * 날짜 셀을 'YYYY-MM-DD' 문자열로 변환합니다.
 * @param {*} value - 셀 값 (Date 또는 문자열)
 * @return {string} 날짜 문자열
 */
function formatDateCell_(value) {
  // instanceof Date가 실행 컨텍스트에 따라 실패할 수 있어 getTime 유무로 판정.
  if (value && typeof value.getTime === 'function') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  }
  return value ? String(value).slice(0, 10) : ''
}

/**
 * 오늘 날짜를 'yyyy-MM-dd' 문자열로 반환합니다.
 * 시트 '일시' 칸에 Date 객체 대신 이 값을 넣으면 셀에 시각 없이 날짜만 표시됩니다.
 * @return {string} 오늘 날짜(yyyy-MM-dd)
 */
function stamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
}

// ===== 요청 처리 =====

/**
 * 자산 등록 데이터를 시트에 저장하고 Slack 알림을 보냅니다.
 * 내부 자산번호를 자동 부여하고, 구매/렌탈 관련 필드까지 함께 적재합니다.
 * @param {Object} p - 자산 등록 폼 값
 * @return {Object} 처리 결과 (부여된 자산번호 포함)
 */
function handleAssetRegister_(p) {
  var now = stamp_() // 시트에 날짜만(시각 제외) 기록
  var assetNumber = generateAssetNumber_()
  appendRow_(SHEET_ASSET, [
    now, //                0 등록일시
    assetNumber, //        1 자산번호(내부 자동 부여)
    p.name, //             2 자산명
    p.category, //         3 구분
    p.manufacturer, //     4 제조사
    p.model, //            5 모델명
    p.serialNumber, //     6 시리얼
    p.purchaseDate, //     7 취득일(구매일/렌탈시작일)
    p.purchaseAmount, //   8 구매금액
    p.user, //             9 사용자
    p.location, //         10 위치
    p.status, //           11 상태
    p.note, //             12 비고
    p.managementNumber, // 13 관리번호(업체 부여)
    p.keyValue, //         14 키값
    p.acquisitionType, //  15 취득구분(구매/렌탈)
    p.rentalCompany, //    16 렌탈사
    p.department, //       17 부서
    p.vendor, //           18 구매처
    p.warrantyUntil, //    19 보증기간
    p.manager, //          20 관리담당자
    '', //                 21 폐기일(등록 시 공란)
    p.monthlyRent || '', //  22 월 렌탈료(렌탈)
    p.contractStart || '', //23 계약 시작일(렌탈)
    p.contractEnd || '', //  24 계약 종료일(렌탈)
    '', //                 25 반납일(렌탈, 등록 시 공란)
  ])

  notifySlack_('🖥️ *새 자산 등록* ' + assetNumber + '\n' + p.name + ' / ' + p.manufacturer + ' / ' + p.category)
  return { ok: true, assetNumber: assetNumber }
}

/**
 * 기존 자산의 운영 정보를 수정합니다. (자산번호로 행을 찾아 셀 갱신)
 * 상태가 바뀌면 변경로그(3_변경로그)에 기록해 추적성을 확보합니다.
 * @param {Object} p - { assetNumber, user, department, location, status, manager, note, disposalDate }
 * @return {Object} 처리 결과
 */
function handleAssetUpdate_(p) {
  var sheet = getSheet_(SHEET_ASSET)
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] !== p.assetNumber) continue
    var row = i + 1 // 시트는 1-based
    var beforeStatus = values[i][11]
    var beforeUser = values[i][9] // 9 사용자(배정 변경 추적용)

    // 편집 가능한 셀만 갱신 (열 index + 1 = 1-based 위치)
    sheet.getRange(row, 10).setValue(p.user || '') //        9 사용자
    sheet.getRange(row, 11).setValue(p.location || '') //    10 위치
    sheet.getRange(row, 12).setValue(p.status || '') //      11 상태
    sheet.getRange(row, 13).setValue(p.note || '') //        12 비고
    sheet.getRange(row, 18).setValue(p.department || '') //  17 부서
    sheet.getRange(row, 21).setValue(p.manager || '') //     20 관리담당자
    sheet.getRange(row, 22).setValue(p.disposalDate || '') //21 폐기일

    // 렌탈 비용 필드는 payload에 포함된 경우에만 갱신(미포함 시 기존값 보존 — 폐기/반납 등에서 덮어쓰기 방지)
    if (typeof p.monthlyRent !== 'undefined') sheet.getRange(row, 23).setValue(p.monthlyRent || '') // 22 월 렌탈료
    if (typeof p.contractStart !== 'undefined') sheet.getRange(row, 24).setValue(p.contractStart || '') // 23 계약 시작일
    if (typeof p.contractEnd !== 'undefined') sheet.getRange(row, 25).setValue(p.contractEnd || '') // 24 계약 종료일

    if (beforeStatus !== p.status) {
      appendRow_(SHEET_LOG, [
        stamp_(),
        '자산변경',
        p.manager || '',
        p.assetNumber,
        '상태',
        beforeStatus,
        p.status,
        '',
      ])
    }
    // 사용자 배정 변경(불출/반납) 추적: 홍길동 → 김춘향 / 홍길동 → (반납)
    if (String(beforeUser || '') !== String(p.user || '')) {
      appendRow_(SHEET_LOG, [
        stamp_(),
        '자산배정',
        p.manager || '',
        p.assetNumber,
        '사용자',
        beforeUser || '(없음)',
        p.user || '(반납)',
        '',
      ])
    }
    return { ok: true }
  }
  return { ok: false, message: '자산번호를 찾을 수 없습니다: ' + p.assetNumber }
}

/**
 * 렌탈 자산 반납 처리. 반납일(25열)을 오늘로 기록하고,
 * 변경로그(3_변경로그)에 '비용지출 종료' 이력을 남깁니다. (월 렌탈료 지출 종료 추적)
 * @param {Object} p - { assetNumber, monthlyRent, rentalCompany, manager }
 * @return {Object} 처리 결과
 */
function handleRentalReturn_(p) {
  var sheet = getSheet_(SHEET_ASSET)
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] !== p.assetNumber) continue
    var row = i + 1
    var today = stamp_() // 반납일: 날짜만(시각 제외)
    sheet.getRange(row, 26).setValue(today) // 25 반납일 (1-based 26)
    var rent = p.monthlyRent || values[i][22] || ''
    var company = p.rentalCompany || values[i][16] || ''
    appendRow_(SHEET_LOG, [
      today,
      '렌탈반납',
      p.manager || '',
      p.assetNumber,
      '비용지출',
      '진행중',
      '종료',
      '월 ' + rent + '원 / ' + company + ' 렌탈 종료',
    ])
    return { ok: true, returnDate: formatDateCell_(today) }
  }
  return { ok: false, message: '자산번호를 찾을 수 없습니다: ' + p.assetNumber }
}

/**
 * 내부 자산번호를 생성합니다. 형식: `AST-YYYY-####` (시트 누적 순번).
 * @return {string} 자산번호
 */
function generateAssetNumber_() {
  var sheet = getSheet_(SHEET_ASSET)
  var rowCount = sheet.getDataRange().getValues().length // 헤더 포함
  var seq = ('000' + Math.max(1, rowCount)).slice(-4)
  var year = new Date().getFullYear()
  return 'AST-' + year + '-' + seq
}

/**
 * 수리 접수의 진행 상태/담당자를 수정합니다. (접수번호로 행을 찾아 갱신)
 * 상태가 '완료'로 바뀌면 처리완료일을 오늘로 기록하고, 상태 변경은 변경로그에 남깁니다.
 * @param {Object} p - { ticketNumber, status, assignee }
 * @return {Object} 처리 결과
 */
function handleRepairUpdate_(p) {
  var sheet = getSheet_(SHEET_REPAIR)
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] !== p.ticketNumber) continue
    var row = i + 1
    var beforeStatus = values[i][9] // 진행상태 (col9)
    var assetNumber = values[i][4] // 4 자산번호(연결 자산 — 완료 시 상태 되돌림용)

    sheet.getRange(row, 10).setValue(p.status || '') //   9 진행상태
    sheet.getRange(row, 11).setValue(p.assignee || '') // 10 담당자
    if (p.status === '완료') {
      sheet.getRange(row, 12).setValue(stamp_()) //     11 처리완료일(날짜만)
      // 수리 완료 → 연결 자산이 '수리중'이면 '사용중'으로 자동 복귀(대시보드·자산탭 '수리 중' 집계에서 제외)
      revertAssetFromRepair_(assetNumber, p.assignee || '총무팀', p.ticketNumber)
    }

    if (beforeStatus !== p.status) {
      appendRow_(SHEET_LOG, [
        stamp_(),
        '수리접수',
        p.assignee || '',
        p.ticketNumber,
        '진행상태',
        beforeStatus,
        p.status,
        '',
      ])
    }
    return { ok: true }
  }
  return { ok: false, message: '접수번호를 찾을 수 없습니다: ' + p.ticketNumber }
}

/**
 * 수리 완료 시, 연결된 자산이 '수리중' 상태면 '사용중'으로 되돌립니다.
 * (자산번호가 비었거나 자산을 못 찾거나, 상태가 '수리중'이 아니면 아무것도 하지 않음 — 폐기/폐기예정 보존)
 * 상태를 바꾸면 3_변경로그에 '자산변경' 이력을 남깁니다.
 * @param {string} assetNumber - 수리접수 행의 자산번호
 * @param {string} actor - 변경 담당자(로그용)
 * @param {string} ticketNumber - 근거 수리 접수번호(로그 메모용)
 * @return {void}
 */
function revertAssetFromRepair_(assetNumber, actor, ticketNumber) {
  if (!assetNumber) return
  var sheet = getSheetOrNull_(SHEET_ASSET)
  if (!sheet) return
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]) !== String(assetNumber)) continue // 1 자산번호
    if (values[i][11] !== '수리중') return // 11 상태 — 수리중일 때만 복귀(폐기 등은 보존)
    sheet.getRange(i + 1, 12).setValue('사용중') // 11 상태(1-based 12)
    appendRow_(SHEET_LOG, [
      stamp_(),
      '자산변경',
      actor,
      assetNumber,
      '상태',
      '수리중',
      '사용중',
      '수리완료(' + (ticketNumber || '') + ') 자동 복귀',
    ])
    return
  }
}

/**
 * 수리 건을 외부 수리업체로 '전달' 표시합니다. (총무팀만 호출)
 * 자체 해결이 안 되는 건만 총무팀이 선택해 전달하며, /vendor는 전달된 건만 봅니다.
 * @param {Object} p - { ticketNumber }
 * @return {Object} 처리 결과
 */
function handleRepairDispatch_(p) {
  var sheet = getSheet_(SHEET_REPAIR)
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] !== p.ticketNumber) continue
    var row = i + 1
    sheet.getRange(row, 13).setValue('Y') // 13번째 열(0-based 12): 외부전달
    appendRow_(SHEET_LOG, [
      stamp_(),
      '수리접수',
      '총무팀',
      p.ticketNumber,
      '외부업체 전달',
      '',
      'Y',
      '',
    ])
    return { ok: true }
  }
  return { ok: false, message: '접수번호를 찾을 수 없습니다: ' + p.ticketNumber }
}

/**
 * 수리 요청을 시트에 저장하고, 변경로그 기록 + Slack + 메일 회신을 처리합니다.
 * @param {Object} p - 수리 요청 폼 값
 * @return {Object} 처리 결과 (접수번호 포함)
 */
function handleRepairRequest_(p) {
  var now = new Date() // 접수번호 생성에 사용(날짜+시각 필요)
  var stamp = stamp_() // 시트 '접수일시' 칸에 넣을 날짜만 문자열(시각 제외)
  var ticketNumber = generateTicketNumber_(now)

  // 사진: images(data URL)가 오면 Drive에 업로드하고 공개 URL을 저장, 없으면 파일명 폴백.
  var attachments = ''
  var photoInfo = { received: 0, saved: 0, errors: [] }
  if (p.images && p.images.length) {
    photoInfo.received = p.images.length
    var saved = saveRepairPhotos_(p.images, ticketNumber)
    photoInfo.saved = saved.urls.length
    photoInfo.errors = saved.errors
    attachments = saved.urls.join(', ')
  } else if (p.photos && p.photos.length) {
    attachments = p.photos.join(', ')
  }

  appendRow_(SHEET_REPAIR, [
    stamp,
    ticketNumber,
    p.requesterName,
    p.department,
    p.assetNumber,
    p.assetName,
    p.symptom,
    p.priority,
    attachments, // 8 첨부(Drive 공개 URL 쉼표구분, 과거분은 파일명)
    '접수',
    '', // 10 담당자(배정 전)
    '', // 11 처리완료일
    '', // 12 외부업체 전달 여부(repairDispatch가 설정)
    p.email || '', // 13 접수자 이메일
    p.location || '', // 14 현재 위치
  ])

  // 모든 접수는 변경로그에 남겨 추적성을 확보합니다.
  appendRow_(SHEET_LOG, [stamp, '수리접수', p.requesterName, ticketNumber, '진행상태', '', '접수', '신규 접수'])

  notifySlack_('🛠️ *새 수리 접수* ' + ticketNumber + '\n' + p.assetNumber + ' - ' + p.symptom)

  // (1) 총무팀(관리자)에게 '신청이 들어왔다'는 알림 메일.
  if (ADMIN_EMAIL) {
    sendMail_(
      ADMIN_EMAIL,
      '[IT 자산관리] 새 수리 요청이 접수되었습니다 (' + ticketNumber + ')',
      '새 수리 요청이 접수되었습니다.\n\n' +
        '접수번호: ' + ticketNumber + '\n' +
        '신청자: ' + (p.requesterName || '') + ' (' + (p.department || '') + ')\n' +
        '연락처: ' + (p.contact || '') + '\n' +
        '이메일: ' + (p.email || '') + '\n' +
        '현재 위치: ' + (p.location || '') + '\n' +
        '자산: ' + (p.assetNumber || '') + ' ' + (p.assetName || '') + '\n' +
        '증상: ' + (p.symptom || '') + '\n\n' +
        '신청관리 화면에서 확인해 주세요.',
    )
  }

  // (2) 신청자 이메일로 '접수되었다'는 확인 메일. 폼 입력 우선, 없으면 사용자목록에서 이름으로 조회.
  var email = (p.email && String(p.email).indexOf('@') !== -1) ? p.email : lookupEmailByName_(p.requesterName)
  if (email) {
    sendMail_(
      email,
      '[IT 자산관리] 수리 요청이 접수되었습니다 (' + ticketNumber + ')',
      '안녕하세요 ' + p.requesterName + '님,\n\n' +
        '수리 요청이 정상 접수되었습니다.\n' +
        '접수번호: ' + ticketNumber + '\n' +
        '자산: ' + p.assetNumber + ' ' + (p.assetName || '') + '\n' +
        '증상: ' + p.symptom + '\n' +
        '현재 위치: ' + (p.location || '') + '\n\n' +
        '담당자가 확인 후 빠르게 연락드리겠습니다.',
    )
  }

  return { ok: true, ticketNumber: ticketNumber, photoInfo: photoInfo }
}

// ===== 헬퍼 =====

/**
 * 이름 기준 접수번호를 생성합니다. 형식: R-YYYY-MMDD-#### (당일 순번)
 * @param {Date} date - 접수 일시
 * @return {string} 접수번호
 */
function generateTicketNumber_(date) {
  var sheet = getSheet_(SHEET_REPAIR)
  var todayCount = 1
  var values = sheet.getDataRange().getValues()
  var y = date.getFullYear()
  var m = date.getMonth()
  var d = date.getDate()
  // 헤더(0행) 제외, 같은 날짜의 접수 건수를 세어 순번을 만듭니다.
  for (var i = 1; i < values.length; i++) {
    var when = values[i][0]
    if (when instanceof Date && when.getFullYear() === y && when.getMonth() === m && when.getDate() === d) {
      todayCount++
    }
  }
  var mm = ('0' + (m + 1)).slice(-2)
  var dd = ('0' + d).slice(-2)
  var seq = ('000' + todayCount).slice(-4)
  return 'R-' + y + '-' + mm + dd + '-' + seq
}

/**
 * 수리 사진(data URL 배열)을 Google Drive에 저장하고 이미지 URL 배열을 반환합니다.
 * 저장 위치: REPAIR_PHOTO_FOLDER_ID 폴더(사용자가 공유 설정한 폴더). 미설정 시 'SMC_수리사진' 자동 생성.
 * 폴더가 이미 공개(링크 공유)면 파일이 그 설정을 상속하므로 별도 공개 설정은 시도만 하고 실패는 무시합니다.
 * @param {string[]} images - `data:image/...;base64,...` 형식 data URL 배열
 * @param {string} ticketNumber - 접수번호(파일명 접두어)
 * @return {string[]} 각 이미지의 이미지 URL
 */
function saveRepairPhotos_(images, ticketNumber) {
  var urls = []
  var errors = []
  var folder
  try {
    folder = getRepairPhotoFolder_()
  } catch (folderErr) {
    return { urls: urls, errors: ['폴더 접근 실패: ' + String(folderErr)] }
  }
  for (var i = 0; i < images.length; i++) {
    var dataUrl = images[i]
    if (!dataUrl || String(dataUrl).indexOf('base64,') === -1) {
      errors.push((i + 1) + '번: data URL 형식 아님')
      continue
    }
    try {
      var comma = dataUrl.indexOf(',')
      var meta = dataUrl.substring(0, comma) // 예: data:image/jpeg;base64
      var b64 = dataUrl.substring(comma + 1)
      var contentType = meta.substring(meta.indexOf(':') + 1, meta.indexOf(';')) || 'image/jpeg'
      var bytes = Utilities.base64Decode(b64)
      var blob = Utilities.newBlob(bytes, contentType, ticketNumber + '_' + (i + 1) + '.jpg')
      var file = folder.createFile(blob)
      // 폴더가 공개면 상속됨. 아니면 링크 공유 시도(도메인 정책상 막히면 무시 — 폴더 공유에 의존).
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
      } catch (shareErr) {
        // 조직 정책으로 개별 공유가 막혀도 폴더 공유를 상속하므로 계속 진행
      }
      urls.push('https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600')
    } catch (err) {
      errors.push((i + 1) + '번: ' + String(err))
    }
  }
  return { urls: urls, errors: errors }
}

/**
 * [일회성 권한 승인용] 편집기에서 직접 실행하는 함수.
 * DriveApp 접근 권한(수리 사진 저장) 승인 팝업을 띄우기 위해 사용합니다.
 * 이름 끝에 `_`가 없어야 실행 드롭다운에 표시됩니다.
 * 실행 → 권한 허용 → 로그에 폴더명이 찍히면 성공.
 * @return {void}
 */
function authorizeDrive() {
  var folder = getRepairPhotoFolder_()
  // 쓰기(createFile) 권한까지 승인받기 위해 실제로 테스트 파일을 만들고 즉시 휴지통으로 보냅니다.
  // (읽기 전용만 승인되면 사진 저장이 실패하므로, 여기서 쓰기 스코프를 강제로 요구)
  var probe = folder.createFile('__auth_probe__.txt', 'ok', 'text/plain')
  probe.setTrashed(true)
  Logger.log('Drive 쓰기 권한 OK: ' + folder.getName())
}

/**
 * 수리 사진 저장 폴더를 반환합니다.
 * REPAIR_PHOTO_FOLDER_ID가 있으면 그 폴더를, 없으면 'SMC_수리사진'을 찾거나 생성합니다.
 * @return {GoogleAppsScript.Drive.Folder} 폴더
 */
function getRepairPhotoFolder_() {
  if (REPAIR_PHOTO_FOLDER_ID) {
    return DriveApp.getFolderById(REPAIR_PHOTO_FOLDER_ID)
  }
  var it = DriveApp.getFoldersByName('SMC_수리사진')
  if (it.hasNext()) return it.next()
  return DriveApp.createFolder('SMC_수리사진')
}

/**
 * 이름으로 시트 탭을 찾습니다. (생성하지 않음)
 * 정확 일치로 먼저 찾고, 못 찾으면 앞뒤 공백을 무시한 trim 비교로 재탐색합니다.
 * → 이름에 실수로 공백이 섞인 시트를 '없다'고 오판해 중복 생성하는 문제를 방지.
 * @param {string} name - 시트 탭 이름
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} 시트 또는 null
 */
function getSheetOrNull_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(name)
  if (sheet) return sheet
  var all = ss.getSheets()
  var target = String(name).trim()
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].getName()).trim() === target) return all[i]
  }
  return null
}

/**
 * 시트 탭을 가져옵니다. 없으면 새로 만듭니다. (쓰기 경로 전용)
 * 조회(읽기) 함수는 이 함수 대신 getSheetOrNull_을 써서 빈 시트를 만들지 않습니다.
 * @param {string} name - 시트 탭 이름
 * @return {GoogleAppsScript.Spreadsheet.Sheet} 시트
 */
function getSheet_(name) {
  var sheet = getSheetOrNull_(name)
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(name)
  return sheet
}

/**
 * 시트 마지막에 행을 추가합니다.
 * @param {string} sheetName - 시트 탭 이름
 * @param {Array} row - 추가할 행 데이터
 */
function appendRow_(sheetName, row) {
  getSheet_(sheetName).appendRow(row)
}

/**
 * 사용자목록 시트에서 이름으로 이메일을 조회합니다.
 * (열 순서: 0사번 1이름 2본부 3부서 4직급 5이메일 — 본부열 추가 반영)
 * @param {string} name - 조회할 이름
 * @return {string} 이메일 (없으면 빈 문자열)
 */
function lookupEmailByName_(name) {
  if (!name) return ''
  var sheet = getSheetOrNull_(SHEET_USER)
  if (!sheet) return ''
  var values = sheet.getDataRange().getValues()
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] === name) return values[i][5] || '' // 5 이메일
  }
  return ''
}

/**
 * 메일을 보냅니다. 보낸사람(From)을 SENDER_EMAIL/SENDER_NAME로 지정하되,
 * 그 주소가 Gmail '다른 주소에서 메일 보내기(alias)'에 없으면 예외가 나므로
 * 기본 계정 주소로 폴백 재발송합니다. (요청 처리가 메일 때문에 실패하지 않게)
 * @param {string} to - 받는사람
 * @param {string} subject - 제목
 * @param {string} body - 본문(텍스트)
 * @return {void}
 */
function sendMail_(to, subject, body) {
  try {
    MailApp.sendEmail({ to: to, subject: subject, body: body, from: SENDER_EMAIL, name: SENDER_NAME })
  } catch (e) {
    // from(별칭) 미등록 등으로 실패 → 보낸사람 지정 없이 기본 계정으로 발송(이름만 적용)
    MailApp.sendEmail({ to: to, subject: subject, body: body, name: SENDER_NAME })
  }
}

/**
 * [테스트용] 편집기에서 직접 실행하는 함수. `ADMIN_EMAIL`(=general_affairs@)로 테스트 메일을 보냅니다.
 * 실행 → general_affairs@ 받은편지함 확인. 오류가 나면(주소 없음/수신불가 등) 실행 로그에 사유가 표시됩니다.
 * @return {void}
 */
function testMail() {
  // 폴백 때문에 조용히 넘어가지 않도록, 여기서는 MailApp을 직접 호출해 에러를 그대로 노출.
  MailApp.sendEmail(ADMIN_EMAIL, '[테스트] 접수 알림 메일 확인', '이 메일이 보이면 발송/수신 정상입니다. (' + ADMIN_EMAIL + ')')
  Logger.log('테스트 메일 발송 성공 → ' + ADMIN_EMAIL)
}

/**
 * Slack Webhook으로 메시지를 보냅니다. (URL 미설정 시 무시)
 * @param {string} text - 보낼 메시지
 */
function notifySlack_(text) {
  if (!SLACK_WEBHOOK_URL) return
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  })
}

/**
 * 객체를 JSON 텍스트 응답으로 변환합니다.
 * @param {Object} obj - 응답 객체
 * @return {GoogleAppsScript.Content.TextOutput} JSON 출력
 */
function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
