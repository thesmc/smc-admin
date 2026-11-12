import { useEffect, useState } from 'react'
import { isMockMode } from '@/lib/gasClient'
import { fetchFaq } from './api'
import { FAQ_MOCK } from './mock/faqMock'
import type { FaqItem } from './types'

/** {@link useFaq} 반환 형태. */
export interface UseFaqReturn {
  /** 조회된 FAQ 목록. */
  faq: FaqItem[]
  /** 조회 진행 중 여부. */
  loading: boolean
  /** mock 사용 중 여부. */
  usingMock: boolean
}

/**
 * FAQ 목록 조회 훅. (GAS `?action=faq` + mock 폴백)
 * 편집은 페이지에서 draft 상태로 관리하고 저장 시 `saveFaq`를 호출합니다.
 *
 * @returns FAQ 목록·로딩 상태 ({@link UseFaqReturn})
 */
export function useFaq(): UseFaqReturn {
  const [faq, setFaq] = useState<FaqItem[]>(FAQ_MOCK)
  const [loading, setLoading] = useState<boolean>(!isMockMode())
  const [usingMock, setUsingMock] = useState<boolean>(true)

  useEffect(() => {
    if (isMockMode()) return
    let alive = true
    fetchFaq().then((real) => {
      if (!alive) return
      if (real) {
        setFaq(real)
        setUsingMock(false)
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return { faq, loading, usingMock }
}
