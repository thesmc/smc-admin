import { Laptop, BadgeCheck, Boxes } from 'lucide-react'
import { StatCard, type StatTone } from '@/components/ui'
import type { DashboardStats } from '../types'

/** {@link StatCardRow} 컴포넌트 props. */
interface StatCardRowProps {
  /** 상단 KPI 지표. */
  stats: DashboardStats
}

/** 통계 카드 한 장의 표시 정의. */
interface StatDef {
  label: string
  value: string
  unit: string
  caption: string
  tone: StatTone
  Icon: typeof Laptop
}

/**
 * 대시보드 상단 KPI 카드 묶음. (이미지 ④ 상단 5개)
 * 데이터는 props로 받아 mock/실데이터 어느 쪽이든 표시할 수 있습니다.
 *
 * @param props - {@link StatCardRowProps}
 * @returns 통계 카드 그리드
 */
export default function StatCardRow({ stats }: StatCardRowProps) {
  /** 전체 대비 비율(%) 문자열. 전체가 0이면 '0'. */
  const percentOfTotal = (count: number): string =>
    stats.totalAssets ? ((count / stats.totalAssets) * 100).toFixed(1) : '0'

  const cards: StatDef[] = [
    { label: '전체 자산 수', value: stats.totalAssets.toLocaleString('ko-KR'), unit: '대', caption: '전체 자산', tone: 'blue', Icon: Laptop },
    { label: '사용 중 자산', value: stats.inUseAssets.toLocaleString('ko-KR'), unit: '대', caption: `전체의 ${percentOfTotal(stats.inUseAssets)}%`, tone: 'green', Icon: BadgeCheck },
    { label: '재고 자산 수량', value: stats.stockAssets.toLocaleString('ko-KR'), unit: '대', caption: `전체의 ${percentOfTotal(stats.stockAssets)}%`, tone: 'purple', Icon: Boxes },
  ]

  return (
    <div className="stat-row">
      {cards.map(({ Icon, ...stat }) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          unit={stat.unit}
          caption={stat.caption}
          tone={stat.tone}
          icon={<Icon size={22} />}
        />
      ))}
    </div>
  )
}
