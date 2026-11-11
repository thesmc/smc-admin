import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui'
import { AUTH_SETTINGS_EVENT, readGuestEnabled, saveGuestEnabled } from '@/app/authSettings'
import './GuestAccessSection.css'

/**
 * '비밀번호 없이 입장' 허용 토글 섹션. (설정 화면 · 총무팀)
 * 켜면 로그인 화면에 '비밀번호 없이 입장(총무팀)' 버튼이 생겨 누구나 비밀번호 없이
 * 총무팀 화면에 들어올 수 있습니다. 서버(시트)에 저장되어 모든 기기에 적용되며,
 * 끄면 비밀번호 없이 들어온 세션은 새로고침·재방문 시 다시 막힙니다.
 *
 * @returns 비밀번호 없이 입장 설정 섹션
 */
export default function GuestAccessSection() {
  const [enabled, setEnabled] = useState<boolean>(readGuestEnabled)
  const [saving, setSaving] = useState(false)

  // 서버 동기화/다른 탭 변경 시 토글 상태를 최신으로 유지
  useEffect(() => {
    const sync = () => setEnabled(readGuestEnabled())
    window.addEventListener(AUTH_SETTINGS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_SETTINGS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  /** 토글 변경 → 확인 후 서버 저장. 켤 때는 보안 경고를 띄웁니다. */
  async function handleToggle(next: boolean) {
    if (next && !window.confirm('비밀번호 없이 접속을 허용할까요?\n링크를 아는 누구나 총무팀 화면·데이터에 들어올 수 있습니다.')) {
      return
    }
    setSaving(true)
    const result = await saveGuestEnabled(next)
    setSaving(false)
    if (result.ok) {
      setEnabled(next)
    } else {
      window.alert(`저장 실패: ${result.message ?? '서버 오류'}`)
    }
  }

  return (
    <Card title="비밀번호 없이 접속 (임시 개방)">
      <p className="guest-desc">
        켜면 로그인 화면에 <b>‘비밀번호 없이 입장(총무팀)’</b> 버튼이 생겨 누구나 비밀번호 없이 들어올 수 있습니다.
        서버에 저장되어 모든 기기에 적용되고, 끄면 비밀번호 없이 들어온 세션은 새로고침 시 다시 막힙니다.
      </p>

      <label className="guest-row">
        <span className="guest-label">
          <ShieldAlert size={16} /> 비밀번호 없이 입장 허용
          <span className={`guest-state ${enabled ? 'on' : 'off'}`}>{enabled ? '켜짐' : '꺼짐'}</span>
        </span>
        <span className="guest-switch">
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className="guest-slider" />
        </span>
      </label>

      <p className="guest-hint">
        ⚠️ 보안 주의: 켜 둔 동안에는 접근 제어가 사실상 해제됩니다. 필요한 동안만 켜고 바로 끄는 것을 권장합니다.
      </p>
    </Card>
  )
}
