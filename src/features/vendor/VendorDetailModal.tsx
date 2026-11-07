import { useState } from 'react'
import { Modal, Badge } from '@/components/ui'
import { FormField, SelectField } from '@/components/form'
import { getRepairStatusVariant } from '@/lib/badgeVariant'
import { updateRepair } from '@/features/repair/api'
import RepairPhotos from '@/features/repair/components/RepairPhotos'
import type { RepairRow } from '@/features/repair/types'
import type { RepairStatus } from '@/constants/repair'
import './VendorDetailModal.css'

/** 외부업체가 설정할 수 있는 진행 상태(확인 → 수리중 → 완료). */
const VENDOR_STATUSES: RepairStatus[] = ['확인', '수리중', '완료']

/** {@link VendorDetailModal} 컴포넌트 props. */
interface VendorDetailModalProps {
  /** 표시할 수리 건. null이면 렌더 안 함. */
  repair: RepairRow | null
  /** 닫기 콜백. */
  onClose: () => void
  /** 상태 저장 성공 시 로컬 목록 갱신 콜백. */
  onSaved: (ticketNumber: string, patch: Partial<RepairRow>) => void
}

/**
 * 외부업체용 수리 상세 팝업.
 * 목록에서 요청을 클릭하면 전체 정보(증상·사진 등)를 보여주고,
 * 진행 상태(확인/수리중/완료)를 선택해 저장할 수 있습니다. '완료' 저장 시 목록에서 사라집니다.
 *
 * @param props - {@link VendorDetailModalProps}
 * @returns 상세 팝업 (repair가 null이면 렌더 안 함)
 */
export default function VendorDetailModal({ repair, onClose, onSaved }: VendorDetailModalProps) {
  // repair가 없을 때도 훅 순서를 지키기 위해 상태 훅을 먼저 선언합니다.
  const [status, setStatus] = useState<RepairStatus>(
    repair && VENDOR_STATUSES.includes(repair.status) ? repair.status : '확인',
  )
  const [saving, setSaving] = useState(false)

  if (!repair) return null

  const photoCount = repair.attachments
    ? repair.attachments.split(',').map((s) => s.trim()).filter(Boolean).length
    : 0

  /** 진행 상태 저장. 외부업체가 처리하므로 담당자는 '외부업체'로 기록합니다. */
  async function handleSave() {
    if (!repair) return
    setSaving(true)
    const result = await updateRepair({
      ticketNumber: repair.ticketNumber,
      status,
      assignee: repair.assignee || '외부업체',
    })
    setSaving(false)
    if (result.ok) {
      onSaved(repair.ticketNumber, { status, assignee: repair.assignee || '외부업체' })
      onClose()
    } else {
      window.alert(`저장 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  const footer = (
    <>
      <button type="button" className="vd-btn" onClick={onClose} disabled={saving}>
        닫기
      </button>
      <button type="button" className="vd-btn primary" onClick={handleSave} disabled={saving}>
        {saving ? '저장 중…' : status === '완료' ? '완료 처리' : '저장'}
      </button>
    </>
  )

  return (
    <Modal open title={`${repair.ticketNumber} · 수리 상세`} onClose={onClose} footer={footer}>
      <dl className="vd-grid">
        <div>
          <dt>접수일</dt>
          <dd>{repair.receivedAt}</dd>
        </div>
        <div>
          <dt>현재 상태</dt>
          <dd>
            <Badge variant={getRepairStatusVariant(repair.status)}>{repair.status}</Badge>
          </dd>
        </div>
        <div>
          <dt>자산</dt>
          <dd>
            {repair.assetNumber} {repair.assetName && `· ${repair.assetName}`}
          </dd>
        </div>
        <div>
          <dt>우선순위</dt>
          <dd>{repair.priority}</dd>
        </div>
        {repair.location && (
          <div>
            <dt>현재 위치</dt>
            <dd>{repair.location}</dd>
          </div>
        )}
        <div className="vd-full">
          <dt>증상</dt>
          <dd>{repair.symptom}</dd>
        </div>
      </dl>

      <div className="vd-edit">
        <FormField label="진행 상황" htmlFor="vd-status" required>
          <SelectField
            id="vd-status"
            value={status}
            onChange={(v) => setStatus(v as RepairStatus)}
            options={VENDOR_STATUSES}
          />
        </FormField>
        <p className="vd-hint">‘완료’로 저장하면 목록에서 사라지고 시트에는 ‘완료’로 기록됩니다.</p>
      </div>

      <div className="vd-photos">
        <div className="vd-photos-title">첨부 사진 ({photoCount})</div>
        <RepairPhotos attachments={repair.attachments} />
      </div>
    </Modal>
  )
}
