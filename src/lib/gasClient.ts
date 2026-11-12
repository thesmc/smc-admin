import { GAS_URL, API_TOKEN } from '@/config/api'

/** 백엔드로 보낼 수 있는 요청 종류. */
export type GasRequestType =
  | 'assetRegister'
  | 'assetUpdate'
  | 'rentalReturn'
  | 'repairRequest'
  | 'repairUpdate'
  | 'repairDispatch'
  | 'userRegister'
  | 'userUpdate'
  | 'assetRequest'
  | 'returnRequest'
  | 'consumableRequest'
  | 'assetSwapRequest'
  | 'requestUpdate'
  | 'orgSettingsUpdate'
  | 'masterCodesUpdate'
  | 'authSettingsUpdate'
  | 'faqUpdate'

/** 백엔드(GAS) 공통 응답 형식. */
export interface GasResult {
  /** 처리 성공 여부. */
  ok: boolean
  /** (수리요청) 서버가 부여한 접수번호. */
  ticketNumber?: string
  /** 실패 시 사유 등 메시지. */
  message?: string
  /** (수리요청) 사진 저장 진단: 받은/저장된 장수 + 에러. */
  photoInfo?: { received: number; saved: number; errors: string[] }
}

/** GAS_URL이 설정되지 않아 mock 모드로 동작하는지 여부. */
export function isMockMode(): boolean {
  return !GAS_URL || GAS_URL === '#'
}

/**
 * Google Apps Script 웹앱으로 데이터를 전송합니다.
 *
 * @remarks
 * `Content-Type`을 `text/plain`으로 보내는 이유: Apps Script 웹앱은 CORS
 * 프리플라이트(OPTIONS) 요청을 처리하지 못합니다. `application/json`을 쓰면
 * 브라우저가 프리플라이트를 보내 실패하므로, 프리플라이트가 없는 `text/plain`으로
 * 전송하고 서버(Code.gs)에서 JSON.parse 합니다.
 *
 * @param type - 요청 종류
 * @param payload - 전송할 데이터(폼 값 등)
 * @returns 서버 응답 ({@link GasResult})
 */
export async function submitToGas(type: GasRequestType, payload: object): Promise<GasResult> {
  // URL 미설정 시: 실제 통신 없이 콘솔 출력 후 성공으로 처리(개발/데모용).
  if (isMockMode()) {
    console.log('[GAS mock]', type, payload)
    return { ok: true, message: 'mock 모드 (GAS_URL 미설정)' }
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // token: 서버(Code.gs)가 이 값을 검증해 무단 요청을 차단합니다.
      body: JSON.stringify({ type, payload, token: API_TOKEN }),
    })
    return (await response.json()) as GasResult
  } catch (error) {
    // 네트워크/파싱 오류는 사용자에게 실패로 안내하고, 콘솔에 원인을 남깁니다.
    console.error('[GAS 전송 실패]', error)
    return { ok: false, message: '전송 중 오류가 발생했습니다.' }
  }
}

/**
 * Google Apps Script 웹앱에서 데이터를 조회합니다(GET).
 * 쿼리스트링에 공유 토큰을 함께 실어 보냅니다.
 *
 * @param params - 쿼리 파라미터 (예: `{ action: 'dashboard' }`)
 * @returns 파싱된 JSON. mock 모드면 `null`.
 */
export async function getFromGas(params: Record<string, string>): Promise<unknown> {
  if (isMockMode()) return null
  const query = new URLSearchParams({ ...params, token: API_TOKEN }).toString()
  const response = await fetch(`${GAS_URL}?${query}`)
  return response.json()
}
