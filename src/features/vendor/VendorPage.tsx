import { useState } from 'react'
import RoleShell from '@/components/layout/RoleShell'
import { Badge } from '@/components/ui'
import LoadingState from '@/components/feedback/LoadingState'
import MockNotice from '@/components/feedback/MockNotice'
import EmptyState from '@/components/feedback/EmptyState'
import { getRepairStatusVariant } from '@/lib/badgeVariant'
import { useVendorRepairs } from './useVendorRepairs'
import VendorDetailModal from './VendorDetailModal'
import type { RepairRow } from '@/features/repair/types'
import './VendorPage.css'

/**
 * 외부 수리업체용 페이지.
 * 총무팀이 '외부업체 전달'한 수리 건만 목록으로 보여줍니다. (읽기 전용, 모바일 우선)
 *
 * @returns 외부업체 페이지
 */
export default function VendorPage() {
  const { repairs, loading, usingMock, applyUpdate } = useVendorRepairs()
  const [selected, setSelected] = useState<RepairRow | null>(null)

  return (
    <RoleShell title="외부 수리업체">
      {loading && <LoadingState message="목록 불러오는 중…" />}
      {!loading && usingMock && (
        <MockNotice message="샘플(mock) 데이터 표시 중 — 총무팀이 전달한 실제 건이 표시됩니다." />
      )}

      <p className="vendor-desc">총무팀이 전달한 수리 요청 목록입니다. ({repairs.length}건)</p>

      <div className="vendor-list">
        {repairs.length === 0 && <EmptyState title="전달된 수리 요청이 없습니다." hint="총무팀이 전달하면 여기에 표시됩니다." />}
        {repairs.map((r) => (
          <button
            key={r.ticketNumber}
            type="button"
            className="vendor-card"
            onClick={() => setSelected(r)}
          >
            <div className="vendor-card-head">
              <strong>{r.ticketNumber}</strong>
              <Badge variant={getRepairStatusVariant(r.status)}>{r.status}</Badge>
            </div>
            <div className="vendor-card-asset">
              {r.assetNumber} {r.assetName && `· ${r.assetName}`}
            </div>
            <div className="vendor-card-symptom">{r.symptom}</div>
            <div className="vendor-card-meta">
              접수일 {r.receivedAt} · 우선순위 {r.priority}
              {r.attachments ? ` · 사진 ${r.attachments.split(',').length}장` : ''}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <VendorDetailModal
          repair={selected}
          onClose={() => setSelected(null)}
          onSaved={applyUpdate}
        />
      )}
    </RoleShell>
  )
}
