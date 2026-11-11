import { ROLE_PASSWORD_SHA256, type Role } from '@/config/auth'
import { getFromGas, isMockMode, submitToGas, type GasResult } from '@/lib/gasClient'

/**
 * 로그인 비밀번호(역할별) 오버라이드 저장소.
 * 관리자가 설정 화면에서 비밀번호를 바꾸면 **SHA-256 해시**만 서버(시트 `10_로그인설정`)에
 * 저장하고 localStorage에 캐시합니다. → 모든 기기에서 같은 비밀번호로 로그인.
 * 평문은 저장/전송하지 않습니다. 오버라이드가 없는 역할은 `config/auth.ts` 기본 해시 사용.
 */

const STORAGE_KEY = 'smc.auth.hashes'
/** '비밀번호 없이 입장' 허용 플래그 캐시 키. */
const GUEST_KEY = 'smc.auth.guest'

/** 비밀번호 설정 변경 알림 이벤트명. */
export const AUTH_SETTINGS_EVENT = 'smc:auth-settings'

/** 역할 → 해시 부분 맵. */
export type HashOverrides = Partial<Record<Role, string>>

/** 저장된 '비밀번호 없이 입장' 허용 여부를 읽습니다.(기본 false) */
export function readGuestEnabled(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

/** '비밀번호 없이 입장' 허용 여부를 캐시에 저장하고 이벤트를 발행합니다. */
function writeGuestEnabled(on: boolean): void {
  try {
    localStorage.setItem(GUEST_KEY, on ? '1' : '0')
  } catch {
    // 저장 실패는 무시(이벤트만 발행)
  }
  window.dispatchEvent(new Event(AUTH_SETTINGS_EVENT))
}

/** 저장된 오버라이드 해시맵을 읽습니다. */
export function readAuthOverrides(): HashOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HashOverrides) : {}
  } catch {
    return {}
  }
}

/** 오버라이드를 localStorage에 저장하고 이벤트를 발행합니다. */
function writeAuthOverrides(map: HashOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 저장 실패는 무시(이벤트만 발행)
  }
  window.dispatchEvent(new Event(AUTH_SETTINGS_EVENT))
}

/**
 * 로그인 판별에 쓸 **유효 해시맵**(기본값 + 오버라이드)을 반환합니다.
 * @returns 역할별 최종 비밀번호 해시
 */
export function getEffectiveHashes(): Record<Role, string> {
  return { ...ROLE_PASSWORD_SHA256, ...readAuthOverrides() }
}

// ===== 서버(시트) 동기화 =====

/** 서버에 저장되는 인증 블롭: 역할별 해시 오버라이드 + guestEnabled 플래그. */
type AuthBlob = HashOverrides & { guestEnabled?: boolean }

/** GAS `?action=authSettings` 응답 형식. */
interface AuthSettingsResponse {
  ok?: boolean
  auth?: AuthBlob | null
}

/** 저장용 전체 페이로드(현재 캐시된 해시 오버라이드 + guest 플래그)를 만듭니다. */
function buildAuthPayload(overrides: HashOverrides, guestEnabled: boolean): AuthBlob {
  return { ...overrides, guestEnabled }
}

let pullInflight: Promise<boolean> | null = null
let pulledOnce = false

/**
 * 서버에서 비밀번호 해시 오버라이드를 1회 불러와 localStorage 캐시에 반영합니다.
 * @returns 서버 데이터로 갱신했으면 true
 */
export function pullAuthFromServer(): Promise<boolean> {
  if (isMockMode() || pulledOnce) return Promise.resolve(false)
  if (pullInflight) return pullInflight
  pullInflight = (async () => {
    try {
      const json = (await getFromGas({ action: 'authSettings' })) as AuthSettingsResponse | null
      pulledOnce = true
      if (json && json.ok && json.auth) {
        // 서버 블롭을 역할 해시(overrides)와 guestEnabled 플래그로 분리해 각각 캐시에 반영
        const { guestEnabled, ...overrides } = json.auth
        writeAuthOverrides(overrides)
        writeGuestEnabled(!!guestEnabled)
        return true
      }
      return false
    } catch {
      pulledOnce = true
      return false
    } finally {
      pullInflight = null
    }
  })()
  return pullInflight
}

/**
 * 한 역할의 비밀번호 해시를 오버라이드에 반영하고 서버에 저장합니다.
 * @param role - 대상 역할
 * @param hash - 새 비밀번호의 SHA-256 해시
 * @returns 서버 응답
 */
export async function saveRolePasswordHash(role: Role, hash: string): Promise<GasResult> {
  const next = { ...readAuthOverrides(), [role]: hash }
  if (isMockMode()) {
    writeAuthOverrides(next)
    return { ok: true }
  }
  // guestEnabled도 함께 보내 서버에서 유실되지 않도록 함(현재 캐시값 유지)
  const result = await submitToGas('authSettingsUpdate', buildAuthPayload(next, readGuestEnabled()))
  if (result.ok) writeAuthOverrides(next)
  return result
}

/**
 * '비밀번호 없이 입장' 허용 여부를 저장합니다.(서버 + 로컬 캐시, 모든 기기 공유)
 * @param on - 허용 여부
 * @returns 서버 응답
 */
export async function saveGuestEnabled(on: boolean): Promise<GasResult> {
  if (isMockMode()) {
    writeGuestEnabled(on)
    return { ok: true }
  }
  // 비밀번호 해시 오버라이드도 함께 보내 서버에서 유실되지 않도록 함
  const result = await submitToGas('authSettingsUpdate', buildAuthPayload(readAuthOverrides(), on))
  if (result.ok) writeGuestEnabled(on)
  return result
}
