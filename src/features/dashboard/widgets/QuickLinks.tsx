import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ShoppingCart, Package, Wrench, QrCode, FileText } from 'lucide-react'
import { Card } from '@/components/ui'
import ReportModal from '../report/ReportModal'
import './QuickLinks.css'

/** 바로가기 버튼 하나의 정의. */
interface QuickLinkDef {
  label: string
  sub?: string
  tone: string
  Icon: typeof PlusCircle
  /** 이동 경로. 없으면 action으로 처리. */
  to?: string
  /** 경로 대신 수행할 동작(예: 보고서 모달 열기). */
  action?: 'report'
}

/**
 * 바로가기 버튼 목록. (이미지 ④ 하단 '바로가기')
 * 총무팀이 자주 쓰는 화면으로 바로 이동합니다.
 */
const LINKS: QuickLinkDef[] = [
  { label: '자산 등록', sub: '자산관리로 이동', tone: 'blue', Icon: PlusCircle, to: '/admin/assets' },
  { label: '자산 신청', sub: '신청관리로 이동', tone: 'green', Icon: ShoppingCart, to: '/admin/requests' },
  { label: '소모품 신청', sub: '신청관리로 이동', tone: 'orange', Icon: Package, to: '/admin/requests' },
  { label: '유지보수 신청', sub: '수리관리로 이동', tone: 'purple', Icon: Wrench, to: '/admin/repair' },
  { label: 'QR 출력', sub: '자산 라벨·QR 인쇄', tone: 'amber', Icon: QrCode, to: '/admin/assets' },
  { label: '보고서 조회', sub: 'PDF·엑셀 내보내기', tone: 'teal', Icon: FileText, action: 'report' },
]

/**
 * 자주 쓰는 기능으로 이동하는 바로가기 버튼 묶음.
 *
 * @returns 바로가기 카드
 */
export default function QuickLinks() {
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)

  /** 버튼 클릭 시 경로가 있으면 이동, 보고서 action이면 모달, 그 외는 준비중 안내. */
  function handleClick(link: QuickLinkDef) {
    if (link.to) navigate(link.to)
    else if (link.action === 'report') setReportOpen(true)
    else window.alert(`${link.label} 기능은 준비 중입니다.`)
  }

  return (
    <Card title="바로가기">
      <div className="quick-links">
        {LINKS.map((link) => {
          const { Icon, label, sub, tone } = link
          return (
            <button
              key={label}
              type="button"
              className={`quick-link tone-${tone}`}
              onClick={() => handleClick(link)}
            >
              <Icon size={24} />
              <span className="quick-label">{label}</span>
              {sub && <span className="quick-sub">{sub}</span>}
            </button>
          )
        })}
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </Card>
  )
}
