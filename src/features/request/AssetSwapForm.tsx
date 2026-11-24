import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FormSection, FormField, TextInput, SelectField } from '@/components/form'
import { useForm } from '@/hooks/useForm'
import { useMasterCodes } from '@/hooks/useMasterCodes'
import { submitAssetSwap, submitRequestBatch } from './api'
import RequesterFields from './RequesterFields'
import './RequestForm.css'

/** 교체 사유 선택지. */
const SWAP_REASONS = ['고장', '노후', '사양 부족', '파손', '분실', '기타'] as const

/** 교체 대상 자산 1건. */
interface SwapItem {
  assetNumber: string
  assetName: string
  category: string
}

/** 빈 교체 항목. */
function emptyItem(): SwapItem {
  return { assetNumber: '', assetName: '', category: '' }
}

/**
 * 자산 교체 신청 폼 (직원). 사용 중인 자산을 다른 자산으로 교체 요청합니다.
 * 여러 대를 한 번에 교체 신청할 수 있으며, 이력은 `6_신청기록`(종류=자산교체)에 개별 저장됩니다.
 *
 * @returns 자산 교체 신청 폼
 */
export default function AssetSwapForm() {
  const [saving, setSaving] = useState(false)
  const { codes } = useMasterCodes()
  const { values, setField, reset } = useForm({
    requester: '',
    division: '',
    department: '',
    email: '',
    location: '',
    reason: '',
    note: '',
  })
  // '기타' 사유일 때는 비고(설명)를 필수로 받는다.
  const isEtc = values.reason === '기타'
  const [items, setItems] = useState<SwapItem[]>([emptyItem()])

  /** 특정 교체 항목의 한 필드를 갱신합니다. */
  function setItem(index: number, key: keyof SwapItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  const validItems = items.filter((it) => it.assetNumber.trim())
  const canSubmit =
    values.requester.trim() &&
    values.department &&
    values.reason &&
    (!isEtc || values.note.trim()) && // 기타 사유면 설명 필수
    validItems.length > 0

  /** 신청 제출. 자산마다 개별 교체 신청으로 저장합니다. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (validItems.length === 0) {
      window.alert('기존 자산번호를 입력한 항목이 없습니다.')
      return
    }
    setSaving(true)
    const result = await submitRequestBatch(validItems, (it) =>
      submitAssetSwap({
        requester: values.requester,
        division: values.division,
        department: values.department,
        email: values.email,
        location: values.location,
        assetNumber: it.assetNumber,
        assetName: it.assetName,
        category: it.category,
        reason: values.reason,
        note: values.note,
      }),
    )
    setSaving(false)
    if (result.failed === 0) {
      window.alert(`자산 교체 신청 ${result.ok}건이 접수되었습니다.`)
      reset()
      setItems([emptyItem()])
    } else {
      window.alert(`${result.ok}건 접수, ${result.failed}건 실패했습니다. 실패 건은 다시 시도해주세요.`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="자산 교체 신청">
        <RequesterFields
          idPrefix="sw"
          requester={values.requester}
          division={values.division}
          department={values.department}
          email={values.email}
          location={values.location}
          onChange={setField}
        />
        <FormField label="교체 사유" htmlFor="sw-reason" required>
          <SelectField id="sw-reason" value={values.reason} onChange={(v) => setField('reason', v)} options={SWAP_REASONS} />
        </FormField>
        <FormField label={isEtc ? '기타 사유 설명' : '비고'} htmlFor="sw-note" required={isEtc} fullWidth>
          <TextInput
            id="sw-note"
            value={values.note}
            onChange={(v) => setField('note', v)}
            placeholder={isEtc ? '기타 교체 사유를 적어주세요' : '증상·요청사항 등'}
          />
        </FormField>
      </FormSection>

      <div className="req-items">
        <div className="req-items-head">교체 대상 ({validItems.length})</div>
        {items.map((it, i) => (
          <div key={i} className="req-item-row swap">
            <TextInput id={`sw-num-${i}`} value={it.assetNumber} onChange={(v) => setItem(i, 'assetNumber', v)} placeholder="기존 자산번호" />
            <TextInput id={`sw-name2-${i}`} value={it.assetName} onChange={(v) => setItem(i, 'assetName', v)} placeholder="기존 자산명(선택)" />
            <SelectField
              id={`sw-cat-${i}`}
              value={it.category}
              onChange={(v) => setItem(i, 'category', v)}
              options={codes.categories}
              placeholder="교체 희망 품목"
            />
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
        {saving ? '신청 중…' : `자산 교체 신청 (${validItems.length}건)`}
      </button>
    </form>
  )
}
