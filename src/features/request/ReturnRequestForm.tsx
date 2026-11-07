import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FormSection, FormField, TextInput, SelectField } from '@/components/form'
import { useForm } from '@/hooks/useForm'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { submitReturnRequest, submitRequestBatch } from './api'
import './RequestForm.css'

/** 반납 사유 선택지. */
const RETURN_REASONS = ['퇴사', '부서이동', '불용', '고장', '기타'] as const

/** 반납 자산 1건. */
interface ReturnItem {
  assetNumber: string
  assetName: string
}

/** 빈 반납 항목. */
function emptyItem(): ReturnItem {
  return { assetNumber: '', assetName: '' }
}

/**
 * 반납 신청 폼 (직원). 사용 중인 자산의 반납을 총무팀에 신청합니다.
 * 여러 대(모니터 2 + 노트북 등)를 한 번에 반납 신청할 수 있습니다.
 *
 * @returns 반납 신청 폼
 */
export default function ReturnRequestForm() {
  const [saving, setSaving] = useState(false)
  const { departmentOptions, locations } = useOrgSettings()
  const { values, setField, reset } = useForm({
    requester: '',
    department: '',
    email: '',
    location: '',
    reason: '',
    note: '',
  })
  const [items, setItems] = useState<ReturnItem[]>([emptyItem()])

  /** 특정 반납 항목의 한 필드를 갱신합니다. */
  function setItem(index: number, key: keyof ReturnItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  const validItems = items.filter((it) => it.assetNumber.trim())
  const canSubmit = values.requester.trim() && values.department && validItems.length > 0

  /** 신청 제출. 자산마다 개별 반납 신청으로 저장합니다. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (validItems.length === 0) {
      window.alert('자산번호를 입력한 항목이 없습니다.')
      return
    }
    setSaving(true)
    const result = await submitRequestBatch(validItems, (it) =>
      submitReturnRequest({
        requester: values.requester,
        department: values.department,
        email: values.email,
        location: values.location,
        assetNumber: it.assetNumber,
        assetName: it.assetName,
        reason: values.reason,
        note: values.note,
      }),
    )
    setSaving(false)
    if (result.failed === 0) {
      window.alert(`반납 신청 ${result.ok}건이 접수되었습니다.`)
      reset()
      setItems([emptyItem()])
    } else {
      window.alert(`${result.ok}건 접수, ${result.failed}건 실패했습니다. 실패 건은 다시 시도해주세요.`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="반납 신청">
        <FormField label="신청자" htmlFor="rr-name" required>
          <TextInput id="rr-name" value={values.requester} onChange={(v) => setField('requester', v)} />
        </FormField>
        <FormField label="부서" htmlFor="rr-dept" required>
          <SelectField id="rr-dept" value={values.department} onChange={(v) => setField('department', v)} options={departmentOptions} />
        </FormField>
        <FormField label="이메일" htmlFor="rr-email">
          <TextInput id="rr-email" value={values.email} onChange={(v) => setField('email', v)} placeholder="예: hong@thesmc.co.kr" />
        </FormField>
        <FormField label="현재 위치" htmlFor="rr-loc">
          <SelectField id="rr-loc" value={values.location} onChange={(v) => setField('location', v)} options={locations} />
        </FormField>
        <FormField label="반납 사유" htmlFor="rr-reason">
          <SelectField id="rr-reason" value={values.reason} onChange={(v) => setField('reason', v)} options={RETURN_REASONS} />
        </FormField>
        <FormField label="비고" htmlFor="rr-note" fullWidth>
          <TextInput id="rr-note" value={values.note} onChange={(v) => setField('note', v)} />
        </FormField>
      </FormSection>

      <div className="req-items">
        <div className="req-items-head">반납 자산 ({validItems.length})</div>
        {items.map((it, i) => (
          <div key={i} className="req-item-row">
            <TextInput id={`rr-num-${i}`} value={it.assetNumber} onChange={(v) => setItem(i, 'assetNumber', v)} placeholder="자산번호 (예: AST-2026-0001)" />
            <TextInput id={`rr-name2-${i}`} value={it.assetName} onChange={(v) => setItem(i, 'assetName', v)} placeholder="자산명(선택)" />
            <button
              type="button"
              className="req-item-del"
              aria-label="항목 삭제"
              onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" className="req-item-add" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
          <Plus size={15} /> 자산 추가
        </button>
      </div>

      <button type="submit" className="request-submit" disabled={saving || !canSubmit}>
        {saving ? '신청 중…' : `반납 신청 (${validItems.length}건)`}
      </button>
    </form>
  )
}
