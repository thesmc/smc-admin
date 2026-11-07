import { useState } from 'react'
import { Modal, Badge } from '@/components/ui'
import { FormField, SelectField } from '@/components/form'
import { getRequestStatusVariant } from '@/lib/badgeVariant'
import { REQUEST_STATUSES, PROCESS_METHODS } from '@/constants/request'
import type { RequestStatus, ProcessMethod } from '@/constants/request'
import { updateRequest } from './api'
import type { RequestRow } from './types'
import './RequestDetailModal.css'

/** {@link RequestDetailModal} 컴포넌트 props. */
interface RequestDetailModalProps {
  /** 표시·처리할 신청 건. null이면 렌더 안 함. */
  request: RequestRow | null
  /** 닫기 콜백. */
  onClose: () => void
  /** 처리 저장 성공 시 목록 반영 콜백. */
  onSaved: (row: RequestRow) => void
}

/**
 * 총무팀 신청 상세·처리 모달.
 * 상단에 신청 내용(읽기 전용), 하단에 처리(상태/방법/메모) 폼을 둡니다.
 *
 * @param props - {@link RequestDetailModalProps}
 * @returns 신청 상세 모달 (request가 null이면 렌더 안 함)
 */
export default function RequestDetailModal({ request, onClose, onSaved }: RequestDetailModalProps) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<RequestStatus>(request?.status ?? '접수')
  const [method, setMethod] = useState<ProcessMethod | ''>(request?.method ?? '')
  const [note, setNote] = useState(request?.note ?? '')

  if (!request) return null

  /** 처리 저장. 성공 시 목록에 반영하고 닫습니다. */
  async function handleSave() {
    if (!request) return
    setSaving(true)
    const result = await updateRequest({ rowIndex: request.rowIndex, status, method, note })
    setSaving(false)
    if (result.ok) {
      // 처리일시는 서버가 확정하지만, 목록 즉시 반영을 위해 오늘 날짜로 낙관적 갱신
      const today = new Date().toISOString().slice(0, 10)
      onSaved({ ...request, status, method, note, processedAt: status === '접수' ? '' : today })
      onClose()
    } else {
      window.alert(`처리 저장 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  const footer = (
    <>
      <button type="button" className="rd-btn" onClick={onClose} disabled={saving}>
        닫기
      </button>
      <button type="button" className="rd-btn primary" onClick={handleSave} disabled={saving}>
        {saving ? '저장 중…' : '처리 저장'}
      </button>
    </>
  )

  return (
    <Modal
      open
      title={`${request.kind} · ${request.requester}`}
      onClose={onClose}
      footer={footer}
    >
      <dl className="rd-grid">
        <div>
          <dt>신청일</dt>
          <dd>{request.requestedAt}</dd>
        </div>
        <div>
          <dt>현재 상태</dt>
          <dd>
            <Badge variant={getRequestStatusVariant(request.status)}>{request.status}</Badge>
          </dd>
        </div>
        <div>
          <dt>신청자 / 부서</dt>
          <dd>
            {request.requester} {request.department && `· ${request.department}`}
          </dd>
        </div>
        <div>
          <dt>대상</dt>
          <dd>
            {request.target || '-'}
            {request.assetNumber && ` (${request.assetNumber})`}
          </dd>
        </div>
        {(request.email || request.location) && (
          <div>
            <dt>이메일 / 위치</dt>
            <dd>
              {request.email || '-'}
              {request.location && ` · ${request.location}`}
            </dd>
          </div>
        )}
        <div className="rd-full">
          <dt>사유</dt>
          <dd>{request.reason || '-'}</dd>
        </div>
        {request.detail && (
          <div className="rd-full">
            <dt>상세</dt>
            <dd>{request.detail}</dd>
          </div>
        )}
      </dl>

      <div className="rd-process">
        <h3 className="rd-process-title">처리</h3>
        <div className="rd-process-grid">
          <FormField label="상태" htmlFor="rd-status">
            <SelectField
              id="rd-status"
              value={status}
              onChange={(v) => setStatus(v as RequestStatus)}
              options={REQUEST_STATUSES}
            />
          </FormField>
          <FormField label="처리 방법" htmlFor="rd-method">
            <SelectField
              id="rd-method"
              value={method}
              onChange={(v) => setMethod(v as ProcessMethod)}
              options={PROCESS_METHODS}
              placeholder="선택 안 함"
            />
          </FormField>
          <FormField label="처리 메모" htmlFor="rd-note" fullWidth>
            <textarea
              id="rd-note"
              className="rd-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="예: 재고에서 지급 완료 / 아마란스 구매품의 등록 / 카트리지는 외부업체 전달"
            />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}
