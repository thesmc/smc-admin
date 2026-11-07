import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FormSection, FormField, TextInput, SelectField } from '@/components/form'
import { useForm } from '@/hooks/useForm'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { useMasterCodes } from '@/hooks/useMasterCodes'
import { submitAssetRequest, submitRequestBatch } from './api'
import './RequestForm.css'

/** 신청 품목 1건(자산 종류 + 희망 사양). */
interface AssetItem {
  category: string
  spec: string
}

/** 빈 품목 행. */
function emptyItem(): AssetItem {
  return { category: '', spec: '' }
}

/**
 * 자산 신청 폼 (직원). 필요한 자산을 총무팀에 신청합니다.
 * 한 번에 여러 대(예: 모니터 2 + 노트북 1)를 신청할 수 있습니다. (품목 행 추가)
 *
 * @returns 자산 신청 폼
 */
export default function AssetRequestForm() {
  const [saving, setSaving] = useState(false)
  const { departmentOptions, locations } = useOrgSettings()
  const { codes } = useMasterCodes()
  // 공통 정보(신청자/부서/이메일/위치/사유/희망일)는 한 번만 입력
  const { values, setField, reset } = useForm({
    requester: '',
    department: '',
    email: '',
    location: '',
    reason: '',
    wantDate: '',
  })
  // 신청 품목은 여러 개 추가 가능
  const [items, setItems] = useState<AssetItem[]>([emptyItem()])

  /** 특정 품목 행의 한 필드를 갱신합니다. */
  function setItem(index: number, key: keyof AssetItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  const validItems = items.filter((it) => it.category)
  const canSubmit = values.requester.trim() && values.department && validItems.length > 0

  /** 신청 제출. 품목마다 개별 신청으로 저장합니다. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (validItems.length === 0) {
      window.alert('자산 종류를 선택한 품목이 없습니다.')
      return
    }
    setSaving(true)
    const result = await submitRequestBatch(validItems, (it) =>
      submitAssetRequest({
        requester: values.requester,
        department: values.department,
        email: values.email,
        location: values.location,
        category: it.category,
        spec: it.spec,
        reason: values.reason,
        wantDate: values.wantDate,
      }),
    )
    setSaving(false)
    if (result.failed === 0) {
      window.alert(`자산 신청 ${result.ok}건이 접수되었습니다.`)
      reset()
      setItems([emptyItem()])
    } else {
      window.alert(`${result.ok}건 접수, ${result.failed}건 실패했습니다. 실패 건은 다시 시도해주세요.`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="자산 신청">
        <FormField label="신청자" htmlFor="ar-name" required>
          <TextInput id="ar-name" value={values.requester} onChange={(v) => setField('requester', v)} />
        </FormField>
        <FormField label="부서" htmlFor="ar-dept" required>
          <SelectField id="ar-dept" value={values.department} onChange={(v) => setField('department', v)} options={departmentOptions} />
        </FormField>
        <FormField label="이메일" htmlFor="ar-email">
          <TextInput id="ar-email" value={values.email} onChange={(v) => setField('email', v)} placeholder="예: hong@thesmc.co.kr" />
        </FormField>
        <FormField label="현재 위치" htmlFor="ar-loc">
          <SelectField id="ar-loc" value={values.location} onChange={(v) => setField('location', v)} options={locations} />
        </FormField>
        <FormField label="희망일" htmlFor="ar-date">
          <TextInput id="ar-date" type="date" value={values.wantDate} onChange={(v) => setField('wantDate', v)} />
        </FormField>
        <FormField label="신청 사유" htmlFor="ar-reason" fullWidth>
          <TextInput id="ar-reason" value={values.reason} onChange={(v) => setField('reason', v)} placeholder="예: 신규 입사자 지급" />
        </FormField>
      </FormSection>

      <div className="req-items">
        <div className="req-items-head">신청 품목 ({validItems.length})</div>
        {items.map((it, i) => (
          <div key={i} className="req-item-row">
            <SelectField
              id={`ar-cat-${i}`}
              value={it.category}
              onChange={(v) => setItem(i, 'category', v)}
              options={codes.categories}
              placeholder="자산 종류"
            />
            <TextInput id={`ar-spec-${i}`} value={it.spec} onChange={(v) => setItem(i, 'spec', v)} placeholder="희망 사양/모델(선택)" />
            <button
              type="button"
              className="req-item-del"
              aria-label="품목 삭제"
              onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" className="req-item-add" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
          <Plus size={15} /> 품목 추가
        </button>
      </div>

      <button type="submit" className="request-submit" disabled={saving || !canSubmit}>
        {saving ? '신청 중…' : `자산 신청 (${validItems.length}건)`}
      </button>
    </form>
  )
}
