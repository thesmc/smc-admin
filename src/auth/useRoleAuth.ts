import { useCallback, useEffect, useState } from 'react'
import { type Role } from '@/config/auth'
import {
  AUTH_SETTINGS_EVENT,
  getEffectiveHashes,
  pullAuthFromServer,
  readGuestEnabled,
} from '@/app/authSettings'
import { sha256Hex } from '@/lib/sha256'

const STORAGE_KEY = 'smc.role'
/** 이 기기의 로그인이 '비밀번호 없이 입장'으로 들어온 것인지 표시. */
const GUEST_MARK_KEY = 'smc.role.guest'

/** {@link useRoleAuth} 반환 형태. */
export interface UseRoleAuthReturn {
  /** 로그인된 역할(없으면 null). */
  role: Role | null
  /** 로그인 실패 메시지. */
  error: string
  /** '비밀번호 없이 입장' 허용 여부(설정 토글, 서버 공유). */
  guestEnabled: boolean
  /** 비밀번호로 로그인 시도. 성공 시 해당 역할, 실패 시 null. */
  signIn: (password: string) => Promise<Role | null>
  /** 비밀번호 없이 총무팀(admin)으로 입장.(guestEnabled가 true일 때만 노출) */
  enterGuest: () => void
  /** 로그아웃. */
  signOut: () => void
}

/**
 * 저장된 역할을 불러옵니다(유효한 역할일 때만).
 * 단, '비밀번호 없이 입장'으로 들어온 세션은 토글이 꺼지면 무효화합니다.
 * (끄는 즉시 새로고침·재방문 시 다시 비밀번호 화면으로 복귀)
 */
function loadRole(): Role | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw || !(raw in getEffectiveHashes())) return null
    const viaGuest = localStorage.getItem(GUEST_MARK_KEY) === '1'
    if (viaGuest && !readGuestEnabled()) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(GUEST_MARK_KEY)
      return null
    }
    return raw as Role
  } catch {
    return null
  }
}

/**
 * 역할별 비밀번호 로그인 훅.
 * 입력 비밀번호의 SHA-256 해시를 역할별 해시와 대조해 역할을 판별합니다.
 *
 * @returns 역할 상태와 조작 ({@link UseRoleAuthReturn})
 */
export function useRoleAuth(): UseRoleAuthReturn {
  const [role, setRole] = useState<Role | null>(loadRole)
  const [error, setError] = useState('')
  const [guestEnabled, setGuestEnabled] = useState<boolean>(readGuestEnabled)

  // 서버에 저장된 비밀번호 오버라이드 + guest 토글을 1회 당겨와 캐시에 반영(다른 기기 동기화)
  // 캐시가 바뀌면 AUTH_SETTINGS_EVENT가 발행되므로 guestEnabled 상태도 함께 갱신합니다.
  useEffect(() => {
    const sync = () => setGuestEnabled(readGuestEnabled())
    window.addEventListener(AUTH_SETTINGS_EVENT, sync)
    window.addEventListener('storage', sync)
    void pullAuthFromServer().then(sync)
    return () => {
      window.removeEventListener(AUTH_SETTINGS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const signIn = useCallback(async (password: string): Promise<Role | null> => {
    const hash = await sha256Hex(password)
    const hashes = getEffectiveHashes()
    const matched = (Object.keys(hashes) as Role[]).find((r) => hashes[r] === hash)
    if (matched) {
      try {
        localStorage.setItem(STORAGE_KEY, matched)
        localStorage.removeItem(GUEST_MARK_KEY) // 비밀번호 로그인은 guest 세션이 아님
      } catch {
        // 저장 실패해도 이번 세션은 통과
      }
      setError('')
      setRole(matched)
      return matched
    }
    setError('비밀번호가 올바르지 않습니다.')
    return null
  }, [])

  const enterGuest = useCallback(() => {
    // 토글이 켜져 있을 때만 총무팀(admin)으로 입장. guest 세션으로 표시해 토글 OFF 시 무효화.
    if (!readGuestEnabled()) return
    try {
      localStorage.setItem(STORAGE_KEY, 'admin')
      localStorage.setItem(GUEST_MARK_KEY, '1')
    } catch {
      // 저장 실패해도 이번 세션은 통과
    }
    setError('')
    setRole('admin')
  }, [])

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(GUEST_MARK_KEY)
    } catch {
      // 무시
    }
    setRole(null)
  }, [])

  return { role, error, guestEnabled, signIn, enterGuest, signOut }
}
