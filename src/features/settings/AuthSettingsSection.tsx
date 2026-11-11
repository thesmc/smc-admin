import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { Card } from '@/components/ui'
import { ROLE_LABEL, type Role } from '@/config/auth'
import { saveRolePasswordHash } from '@/app/authSettings'
import { sha256Hex } from '@/lib/sha256'
import './AuthSettingsSection.css'

/** 비밀번호를 바꿀 수 있는 역할 목록. */
const ROLES: Role[] = ['admin', 'employee', 'vendor']

/**
 * 로그인 비밀번호 관리 섹션. (설정 화면 · 총무팀)
 * 역할별 새 비밀번호를 입력해 저장하면 SHA-256 해시만 서버에 저장되어
 * 모든 기기에서 새 비밀번호로 로그인됩니다. (평문 미저장)
 *
 * @returns 비밀번호 관리 섹션
 */
export default function AuthSettingsSection() {
  const [inputs, setInputs] = useState<Record<Role, string>>({ admin: '', employee: '', vendor: '' })
  const [savingRole, setSavingRole] = useState<Role | null>(null)

  /** 특정 역할의 새 비밀번호를 해시로 저장합니다. */
  async function save(role: Role) {
    const pw = inputs[role].trim()
    if (pw.length < 4) {
      window.alert('비밀번호는 4자 이상으로 입력해주세요.')
      return
    }
    if (!window.confirm(`${ROLE_LABEL[role]} 로그인 비밀번호를 변경할까요?\n모든 기기에 즉시 적용됩니다.`)) {
      return
    }
    setSavingRole(role)
    const hash = await sha256Hex(pw)
    const result = await saveRolePasswordHash(role, hash)
    setSavingRole(null)
    if (result.ok) {
      setInputs((prev) => ({ ...prev, [role]: '' }))
      window.alert(`${ROLE_LABEL[role]} 비밀번호가 변경되었습니다.`)
    } else {
      window.alert(`저장 실패: ${result.message ?? '서버 오류'}`)
    }
  }

  return (
    <Card title="로그인 비밀번호 관리" collapsible storageKey="set.auth">
      <p className="auth-set-desc">
        역할별 로그인 비밀번호를 변경합니다. 비밀번호는 <b>암호화(SHA-256)되어 저장</b>되며 평문은 저장되지 않습니다.
        변경 즉시 모든 기기에 적용됩니다.
      </p>

      <ul className="auth-set-list">
        {ROLES.map((role) => (
          <li key={role} className="auth-set-item">
            <span className="auth-set-role">
              <KeyRound size={16} /> {ROLE_LABEL[role]}
            </span>
            <input
              type="password"
              className="auth-set-input"
              value={inputs[role]}
              onChange={(e) => setInputs((prev) => ({ ...prev, [role]: e.target.value }))}
              placeholder="새 비밀번호 입력"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-set-btn"
              onClick={() => save(role)}
              disabled={savingRole !== null || inputs[role].trim() === ''}
            >
              <Save size={14} /> {savingRole === role ? '저장 중…' : '변경'}
            </button>
          </li>
        ))}
      </ul>
      <p className="auth-set-hint">
        ※ 비밀번호를 잊으면 복구할 수 없습니다(해시만 저장). 분실 시 코드 기본값으로 재설정이 필요합니다.
      </p>
    </Card>
  )
}
