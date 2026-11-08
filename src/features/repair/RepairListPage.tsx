import { useState } from 'react'
import { Inbox, Wrench, CheckCircle2, Plus } from 'lucide-react'
import { StatCard, Badge, Card, Modal } from '@/components/ui'
import LoadingState from '@/components/feedback/LoadingState'
import MockNotice from '@/components/feedback/MockNotice'
import EmptyState from '@/components/feedback/EmptyState'
import { getRepairStatusVariant } from '@/lib/badgeVariant'
import { useRepairs } from './useRepairs'
import RepairRequestPage from './RepairRequestPage'
import RepairDetailModal from './RepairDetailModal'
import type { RepairRow } from './types'
import './RepairListPage.css'

/**
 * 수리관리 모듈 메인 페이지. (관리자 데스크톱)
 * 요약 카드 + 수리 접수 목록 표를 보여주고, '수리 접수'는 모달로 처리합니다.
 *
 * @returns 수리관리 페이지
 */
export default function RepairListPage() {
  const { repairs, summary, loading, usingMock, patchRepair } = useRepairs()
  const [requestOpen, setRequestOpen] = useState(false)
  const [selected, setSelected] = useState<RepairRow | null>(null)

  // 완료된 접수는 목록에서 숨깁니다.(시트·요약 카드에는 '완료'로 남음)
  // 상세 모달에서 상태를 '완료'로 저장하면 patchRepair로 갱신 → 이 필터로 즉시 사라집니다.
  const openRepairs = repairs.filter((r) => r.status !== '완료')

  return (
    <>
      {loading && <LoadingState message="수리 목록 불러오는 중…" />}
      {!loading && usingMock && (
        <MockNotice message="샘플(mock) 데이터 표시 중 — 구글시트 연동 후 실제 접수가 표시됩니다." />
      )}

      <div className="repair-stat-row">
        <StatCard label="접수(대기)" value={summary.received} unit="건" tone="blue" icon={<Inbox size={22} />} />
        <StatCard label="수리 중" value={summary.inProgress} unit="건" tone="orange" icon={<Wrench size={22} />} />
        <StatCard label="완료" value={summary.done} unit="건" tone="green" icon={<CheckCircle2 size={22} />} />
      </div>

      <Card
        title="수리 접수 목록"
        action={
          <button type="button" className="repair-add-btn" onClick={() => setRequestOpen(true)}>
            <Plus size={16} /> 수리 접수
          </button>
        }
      >
        <div className="repair-table-scroll">
          <table className="repair-table">
            <thead>
              <tr>
                <th>접수번호</th>
                <th>접수일</th>
                <th>자산</th>
                <th>증상</th>
                <th>우선순위</th>
                <th>담당자</th>
                <th className="center">상태</th>
              </tr>
            </thead>
            <tbody>
              {openRepairs.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={Wrench} title="진행 중인 수리 요청이 없습니다." hint="완료된 건은 목록에서 숨겨집니다. 우측 상단 ‘수리 접수’로 등록하세요." />
                  </td>
                </tr>
              )}
              {openRepairs.map((r) => (
                <tr key={r.ticketNumber} className="repair-row" onClick={() => setSelected(r)}>
                  <td>{r.ticketNumber}</td>
                  <td>{r.receivedAt}</td>
                  <td>
                    {r.assetNumber} {r.assetName && `· ${r.assetName}`}
                  </td>
                  <td className="repair-symptom">{r.symptom}</td>
                  <td>{r.priority}</td>
                  <td>{r.assignee || '-'}</td>
                  <td className="center">
                    <Badge variant={getRepairStatusVariant(r.status)}>{r.status}</Badge>
                    {r.dispatched && <span className="repair-dispatched">외부</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={requestOpen} title="수리 접수" onClose={() => setRequestOpen(false)}>
        <RepairRequestPage />
      </Modal>

      {selected && (
        <RepairDetailModal
          key={selected.ticketNumber}
          repair={selected}
          onClose={() => setSelected(null)}
          onSaved={(ticketNumber, patch) => patchRepair(ticketNumber, patch)}
        />
      )}
    </>
  )
}
