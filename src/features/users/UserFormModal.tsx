import { useState } from 'react'
import { Modal } from '@/components/ui'
import { FormField, TextInput, SelectField } from '@/components/form'
import { useForm } from '@/hooks/useForm'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { registerUser, updateUser } from './api'
import type { UserRow } from './types'
import './UserFormModal.css'

/** {@link UserFormModal} 컴포넌트 props. */
interface UserFormModalProps {
  /** 수정할 사용자. null이면 신규 등록. */
  user: UserRow | null
  /** 닫기 콜백. */
  onClose: () => void
  /** 저장 성공 시 목록 반영 콜백. */
  onSaved: (user: UserRow) => void
}

/**
 * 사용자 등록/수정 모달.
 * user가 null이면 신규 등록(사번 입력 가능), 있으면 수정(사번 고정).
 *
 * @param props - {@link UserFormModalProps}
 * @returns 사용자 폼 모달
 */
export default function UserFormModal({ user, onClose, onSaved }: UserFormModalProps) {
  const isNew = user === null
  const [saving, setSaving] = useState(false)
  const { divisions, departmentOptions } = useOrgSettings()
  const { values, setField } = useForm<UserRow>({
    id: user?.id ?? '',
    name: user?.name ?? '',
    division: user?.division ?? '',
    department: user?.department ?? '',
    position: user?.position ?? '',
    email: user?.email ?? '',
  })

  // 본부를 고르면 그 본부의 팀만 부서 후보로 좁힘(미선택 시 전체 팀)
  const deptOptions = values.division
    ? (divisions.find((d) => d.name === values.division)?.teams ?? [])
    : departmentOptions

  const canSave = values.id.trim() !== '' && values.name.trim() !== ''

  /** 저장 처리. 신규면 등록, 아니면 수정 API를 호출합니다. */
  async function handleSave() {
    setSaving(true)
    const result = isNew ? await registerUser(values) : await updateUser(values)
    setSaving(false)
    if (result.ok) {
      onSaved(values)
      onClose()
    } else {
      window.alert(`저장 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  const footer = (
    <>
      <button type="button" className="uf-btn" onClick={onClose} disabled={saving}>
        취소
      </button>
      <button type="button" className="uf-btn primary" onClick={handleSave} disabled={saving || !canSave}>
        {saving ? '저장 중…' : '저장'}
      </button>
    </>
  )

  return (
    <Modal open title={isNew ? '사용자 등록' : `사용자 수정 · ${user?.name}`} onClose={onClose} footer={footer}>
      <div className="uf-grid">
        <FormField label="사번" htmlFor="u-id" required>
          {isNew ? (
            <TextInput
              id="u-id"
              value={values.id}
              onChange={(v) => setField('id', v)}
              placeholder="예: 2201"
            />
          ) : (
            <div className="uf-readonly">{values.id}</div>
          )}
        </FormField>
        <FormField label="이름" htmlFor="u-name" required>
          <TextInput id="u-name" value={values.name} onChange={(v) => setField('name', v)} />
        </FormField>
        <FormField label="본부" htmlFor="u-div">
          <SelectField
            id="u-div"
            value={values.division}
            onChange={(v) => {
              setField('division', v)
              setField('department', '') // 본부 변경 시 부서 초기화(어긋나는 팀 방지)
            }}
            options={divisions.map((d) => d.name)}
            placeholder="본부 선택"
          />
        </FormField>
        <FormField label="부서" htmlFor="u-dept">
          <SelectField
            id="u-dept"
            value={values.department}
            onChange={(v) => setField('department', v)}
            options={deptOptions}
            placeholder="부서(팀) 선택"
          />
        </FormField>
        <FormField label="직급" htmlFor="u-pos">
          <TextInput id="u-pos" value={values.position} onChange={(v) => setField('position', v)} />
        </FormField>
        <FormField label="이메일" htmlFor="u-email" fullWidth>
          <TextInput
            id="u-email"
            value={values.email}
            onChange={(v) => setField('email', v)}
            placeholder="name@thesmc.co.kr"
          />
        </FormField>
      </div>
      {!isNew && <p className="uf-hint">사번은 수정할 수 없습니다.</p>}
    </Modal>
  )
}
