import { submitToGas, type GasResult } from '@/lib/gasClient'

/** 자산 신청 폼 값. */
export interface AssetRequestValues {
  requester: string
  department: string
  /** 요청자 이메일(접수 안내용). */
  email: string
  /** 요청자 현재 위치(사옥·층). */
  location: string
  category: string
  spec: string
  reason: string
  wantDate: string
}

/** 반납 신청 폼 값. */
export interface ReturnRequestValues {
  requester: string
  department: string
  email: string
  location: string
  assetNumber: string
  assetName: string
  reason: string
  note: string
}

/** 소모품 신청 폼 값. */
export interface ConsumableRequestValues {
  requester: string
  department: string
  email: string
  location: string
  item: string
  qty: string
  reason: string
}

/** 자산 교체 신청 폼 값. */
export interface AssetSwapValues {
  requester: string
  department: string
  email: string
  location: string
  /** 교체 대상(기존) 자산번호. */
  assetNumber: string
  /** 교체 대상(기존) 자산명. */
  assetName: string
  /** 교체 희망 품목(구분). */
  category: string
  /** 교체 사유. */
  reason: string
  /** 비고. */
  note: string
}

/**
 * 자산 신청을 백엔드로 전송합니다.
 * @param values - 자산 신청 값
 * @returns 서버 응답
 */
export function submitAssetRequest(values: AssetRequestValues): Promise<GasResult> {
  return submitToGas('assetRequest', values)
}

/**
 * 반납 신청을 백엔드로 전송합니다.
 * @param values - 반납 신청 값
 * @returns 서버 응답
 */
export function submitReturnRequest(values: ReturnRequestValues): Promise<GasResult> {
  return submitToGas('returnRequest', values)
}

/**
 * 소모품 신청을 백엔드로 전송합니다.
 * @param values - 소모품 신청 값
 * @returns 서버 응답
 */
export function submitConsumableRequest(values: ConsumableRequestValues): Promise<GasResult> {
  return submitToGas('consumableRequest', values)
}

/**
 * 자산 교체 신청을 백엔드로 전송합니다.
 * @param values - 자산 교체 신청 값
 * @returns 서버 응답
 */
export function submitAssetSwap(values: AssetSwapValues): Promise<GasResult> {
  return submitToGas('assetSwapRequest', values)
}

/** 여러 건 순차 제출 결과. */
export interface BatchResult {
  /** 성공 건수. */
  ok: number
  /** 실패 건수. */
  failed: number
}

/**
 * 여러 신청 건을 순차로 제출합니다. (직원이 자산 2대 이상 등 한 번에 신청)
 * 시트 순번/동시성 충돌을 피하려 하나씩 보냅니다.
 *
 * @param items - 제출할 값 목록
 * @param submitOne - 개별 제출 함수
 * @returns 성공/실패 요약 ({@link BatchResult})
 */
export async function submitRequestBatch<T>(
  items: T[],
  submitOne: (item: T) => Promise<GasResult>,
): Promise<BatchResult> {
  let ok = 0
  let failed = 0
  for (const item of items) {
    const result = await submitOne(item)
    if (result.ok) ok += 1
    else failed += 1
  }
  return { ok, failed }
}
