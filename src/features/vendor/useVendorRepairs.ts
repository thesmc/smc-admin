import { useEffect, useState } from 'react'
import { isMockMode } from '@/lib/gasClient'
import { REPAIR_MOCK } from '@/features/repair/mock/repairMock'
import type { RepairRow } from '@/features/repair/types'
import { fetchVendorRepairs } from './api'

/** mock: 전달된(dispatched) 수리 건 중 완료되지 않은 것만 */
const VENDOR_MOCK = REPAIR_MOCK.filter((r) => r.dispatched && r.status !== '완료')

/** {@link useVendorRepairs} 반환 형태. */
export interface UseVendorRepairsReturn {
  repairs: RepairRow[]
  loading: boolean
  usingMock: boolean
  /** 특정 건을 로컬 목록에서 갱신합니다. '완료'로 바뀌면 목록에서 제거합니다. */
  applyUpdate: (ticketNumber: string, patch: Partial<RepairRow>) => void
}

/**
 * 외부업체 화면용 수리 목록 훅. (GAS vendorRepairs 조회 + mock 폴백)
 *
 * @returns 전달된 수리 목록·로딩 상태
 */
export function useVendorRepairs(): UseVendorRepairsReturn {
  const [repairs, setRepairs] = useState<RepairRow[]>(VENDOR_MOCK)
  const [loading, setLoading] = useState<boolean>(!isMockMode())
  const [usingMock, setUsingMock] = useState<boolean>(true)

  useEffect(() => {
    if (isMockMode()) return
    let alive = true
    fetchVendorRepairs().then((real) => {
      if (!alive) return
      if (real) {
        setRepairs(real)
        setUsingMock(false)
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  /**
   * 로컬 목록을 갱신합니다. 상태가 '완료'가 되면 외부업체 목록에서 제거합니다.
   * (서버에는 updateRepair로 이미 저장됨 — 여기서는 화면만 즉시 반영)
   */
  function applyUpdate(ticketNumber: string, patch: Partial<RepairRow>) {
    setRepairs((prev) =>
      prev
        .map((r) => (r.ticketNumber === ticketNumber ? { ...r, ...patch } : r))
        .filter((r) => r.status !== '완료'),
    )
  }

  return { repairs, loading, usingMock, applyUpdate }
}
