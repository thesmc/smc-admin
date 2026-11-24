import { useMemo } from 'react'
import { FormField, TextInput, SelectField } from '@/components/form'
import { useOrgSettings } from '@/hooks/useOrgSettings'

/** RequesterFields가 다루는 공통 신청자 필드 키. */
export type RequesterField = 'requester' | 'division' | 'department' | 'email' | 'location'

/** {@link RequesterFields} 컴포넌트 props. */
interface RequesterFieldsProps {
  /** id 접두어(폼마다 고유). */
  idPrefix: string
  /** 신청자 이름. */
  requester: string
  /** 본부. */
  division: string
  /** 부서(팀). */
  department: string
  /** 이메일. */
  email: string
  /** 현재 위치. */
  location: string
  /** 필드 변경 콜백. */
  onChange: (field: RequesterField, value: string) => void
}

/**
 * 직원 신청 폼 공통 상단 필드: 신청자 · 본부 · 부서 · 이메일 · 현재 위치.
 * 본부를 고르면 그 본부 소속 팀만 '부서' 옵션으로 보여주고, 본부 변경 시 부서는 초기화합니다.
 * (여러 신청 폼에서 동일 입력을 재사용 — 중복 제거)
 *
 * @param props - {@link RequesterFieldsProps}
 * @returns 공통 신청자 입력 필드들
 */
export default function RequesterFields({
  idPrefix,
  requester,
  division,
  department,
  email,
  location,
  onChange,
}: RequesterFieldsProps) {
  const { divisions, locations } = useOrgSettings()

  // 본부 선택 시 그 본부의 팀만, 미선택 시 전체 팀을 부서 옵션으로.
  const deptOptions = useMemo(() => {
    if (division) return divisions.find((d) => d.name === division)?.teams ?? []
    return divisions.flatMap((d) => d.teams)
  }, [division, divisions])

  return (
    <>
      <FormField label="신청자" htmlFor={`${idPrefix}-name`} required>
        <TextInput id={`${idPrefix}-name`} value={requester} onChange={(v) => onChange('requester', v)} />
      </FormField>
      <FormField label="본부" htmlFor={`${idPrefix}-div`} required>
        <SelectField
          id={`${idPrefix}-div`}
          value={division}
          onChange={(v) => {
            onChange('division', v)
            onChange('department', '') // 본부가 바뀌면 부서 선택 초기화(불일치 방지)
          }}
          options={divisions.map((d) => d.name)}
        />
      </FormField>
      <FormField label="부서" htmlFor={`${idPrefix}-dept`} required>
        <SelectField
          id={`${idPrefix}-dept`}
          value={department}
          onChange={(v) => onChange('department', v)}
          options={deptOptions}
        />
      </FormField>
      <FormField label="이메일" htmlFor={`${idPrefix}-email`}>
        <TextInput
          id={`${idPrefix}-email`}
          value={email}
          onChange={(v) => onChange('email', v)}
          placeholder="예: hong@thesmc.co.kr"
        />
      </FormField>
      <FormField label="현재 위치" htmlFor={`${idPrefix}-loc`}>
        <SelectField id={`${idPrefix}-loc`} value={location} onChange={(v) => onChange('location', v)} options={locations} />
      </FormField>
    </>
  )
}
