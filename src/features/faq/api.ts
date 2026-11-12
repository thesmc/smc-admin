import { getFromGas, submitToGas, type GasResult } from '@/lib/gasClient'
import type { FaqItem } from './types'

/** GAS `?action=faq` 응답 형식. */
interface FaqResponse {
  ok?: boolean
  faq?: FaqItem[]
}

/**
 * FAQ 목록을 조회합니다.
 * @returns FAQ 배열, 실패/mock/미배포 시 null
 */
export async function fetchFaq(): Promise<FaqItem[] | null> {
  try {
    const json = (await getFromGas({ action: 'faq' })) as FaqResponse | null
    if (json && json.ok && Array.isArray(json.faq)) return json.faq
    return null
  } catch (error) {
    console.error('[FAQ 조회 실패]', error)
    return null
  }
}

/**
 * FAQ 목록을 통째로 저장합니다. (총무팀 편집 → 시트 전체 재작성)
 * @param items - 저장할 FAQ 배열
 * @returns 서버 응답
 */
export function saveFaq(items: FaqItem[]): Promise<GasResult> {
  return submitToGas('faqUpdate', { items })
}
