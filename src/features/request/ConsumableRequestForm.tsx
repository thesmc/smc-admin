import { useState, type FormEvent } from 'react'
import { FormSection, FormField, TextInput, SelectField } from '@/components/form'
import { useForm } from '@/hooks/useForm'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { useMasterCodes } from '@/hooks/useMasterCodes'
import { submitConsumableRequest } from './api'
import './RequestForm.css'

/**
 * 소모품 신청 폼 (직원). 마우스/키보드/카트리지 등 소모품을 신청합니다.
 * 총무팀이 구매/재고지급/외부업체 전달로 처리합니다.
 *
 * @returns 소모품 신청 폼
 */
export default function ConsumableRequestForm() {
  const [saving, setSaving] = useState(false)
  const { departmentOptions, locations } = useOrgSettings()
  const { codes } = useMasterCodes()
  const { values, setField, reset } = useForm({
    requester: '',
    department: '',
    email: '',
    location: '',
    item: '',
    itemEtc: '',
    qty: '1',
    reason: '',
  })

  // '기타' 선택 시 직접입력 값을 실제 품목으로 사용
  const finalItem = values.item === '기타' ? values.itemEtc.trim() : values.item
  const canSubmit = values.requester.trim() && values.department && finalItem

  /** 신청 제출. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const result = await submitConsumableRequest({
      requester: values.requester,
      department: values.department,
      email: values.email,
      location: values.location,
      item: finalItem,
      qty: values.qty,
      reason: values.reason,
    })
    setSaving(false)
    if (result.ok) {
      window.alert('소모품 신청이 접수되었습니다.')
      reset()
    } else {
      window.alert(`신청 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="소모품 신청">
        <FormField label="신청자" htmlFor="cr-name" required>
          <TextInput id="cr-name" value={values.requester} onChange={(v) => setField('requester', v)} />
        </FormField>
        <FormField label="부서" htmlFor="cr-dept" required>
          <SelectField id="cr-dept" value={values.department} onChange={(v) => setField('department', v)} options={departmentOptions} />
        </FormField>
        <FormField label="이메일" htmlFor="cr-email">
          <TextInput id="cr-email" value={values.email} onChange={(v) => setField('email', v)} placeholder="예: hong@thesmc.co.kr" />
        </FormField>
        <FormField label="현재 위치" htmlFor="cr-loc">
          <SelectField id="cr-loc" value={values.location} onChange={(v) => setField('location', v)} options={locations} />
        </FormField>
        <FormField label="소모품" htmlFor="cr-item" required>
          <SelectField id="cr-item" value={values.item} onChange={(v) => setField('item', v)} options={codes.consumables} />
        </FormField>
        {values.item === '기타' && (
          <FormField label="소모품명 직접입력" htmlFor="cr-etc" required>
            <TextInput id="cr-etc" value={values.itemEtc} onChange={(v) => setField('itemEtc', v)} placeholder="예: HDMI 케이블" />
          </FormField>
        )}
        <FormField label="수량" htmlFor="cr-qty">
          <TextInput id="cr-qty" type="number" value={values.qty} onChange={(v) => setField('qty', v)} />
        </FormField>
        <FormField label="신청 사유" htmlFor="cr-reason" fullWidth>
          <TextInput id="cr-reason" value={values.reason} onChange={(v) => setField('reason', v)} placeholder="예: 토너 소진" />
        </FormField>
      </FormSection>
      <button type="submit" className="request-submit" disabled={saving || !canSubmit}>
        {saving ? '신청 중…' : '소모품 신청'}
      </button>
    </form>
  )
}
