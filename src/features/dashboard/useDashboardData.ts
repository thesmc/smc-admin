import { useEffect, useState } from 'react'
import { isMockMode } from '@/lib/gasClient'
import { fetchDashboard } from './api'
import { DASHBOARD_MOCK } from './mock/dashboardMock'
import type { DashboardData } from './types'

/** {@link useDashboardData} 반환 형태. */
export interface DashboardState {
  /** 화면에 표시할 데이터 (실데이터 + mock 폴백 병합본). */
  data: DashboardData
  /** 조회 진행 중 여부. */
  loading: boolean
  /** 실데이터 없이 mock만 사용 중인지 여부(안내 배지용). */
  usingMock: boolean
}

/**
 * 서버 응답에 실제 자산 데이터가 있는지 판정합니다.
 * (자산이 0건이면 통계·집계가 모두 비어 mock을 유지하는 편이 화면상 일관적)
 *
 * @param real - 서버가 반환한 부분 데이터
 * @returns 의미 있는 실데이터가 있으면 true
 */
function hasRealData(real: Partial<DashboardData>): boolean {
  return (
    (real.stats?.totalAssets ?? 0) > 0 ||
    !!real.categories?.length ||
    !!real.recentAssets?.length ||
    !!real.requests?.length ||
    !!real.lowStock?.length ||
    !!real.disposals?.length
  )
}

/**
 * 실데이터(Partial)를 완전한 형태로 채웁니다.
 * **실데이터 모드에서는 mock 콘텐츠를 섞지 않습니다** — 서버가 비운 섹션은
 * 빈 상태로 두어(예: 폐기예정 0건) 실제와 다른 가짜가 보이지 않게 합니다.
 * (누락 필드는 타입 안전을 위해 빈 기본값으로만 채움)
 *
 * @param real - 서버가 반환한 부분 데이터
 * @returns 완전한 {@link DashboardData}
 */
function fillReal(real: Partial<DashboardData>): DashboardData {
  return {
    stats: real.stats ?? {
      totalAssets: 0,
      inUseAssets: 0,
      repairingAssets: 0,
      disposalPlannedAssets: 0,
      stockAssets: 0,
      lowStockCount: 0,
    },
    categories: real.categories ?? [],
    acquisition: real.acquisition ?? { purchase: 0, rental: 0 },
    rentalByCompany: real.rentalByCompany ?? [],
    rentalMonthlyTotal: real.rentalMonthlyTotal ?? 0,
    requests: real.requests ?? [],
    lowStock: real.lowStock ?? [],
    recentAssets: real.recentAssets ?? [],
    recentChanges: real.recentChanges ?? [],
    disposals: real.disposals ?? [],
  }
}

/**
 * 관리자 대시보드 데이터 훅.
 * mock 모드면 즉시 mock을 반환하고, 실사용 모드면 GAS에서 조회해
 * mock 위에 병합합니다. 실패/미배포 시에는 mock을 유지합니다.
 *
 * @returns 대시보드 상태 ({@link DashboardState})
 */
export function useDashboardData(): DashboardState {
  const [data, setData] = useState<DashboardData>(DASHBOARD_MOCK)
  const [loading, setLoading] = useState<boolean>(!isMockMode())
  const [usingMock, setUsingMock] = useState<boolean>(true)

  useEffect(() => {
    if (isMockMode()) return

    // StrictMode 이중 실행/언마운트 후 setState 방지용 플래그
    let alive = true
    fetchDashboard().then((real) => {
      if (!alive) return
      if (real && hasRealData(real)) {
        // 실데이터 모드: 서버 값 그대로(빈 섹션은 빈 상태). mock 콘텐츠 섞지 않음.
        setData(fillReal(real))
        setUsingMock(false)
      } else {
        // GAS 미배포/조회 실패/빈 시트: 데모용 mock 유지
        setData(DASHBOARD_MOCK)
        setUsingMock(true)
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return { data, loading, usingMock }
}
