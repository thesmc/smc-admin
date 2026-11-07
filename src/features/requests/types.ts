import type { RequestKind, RequestStatus, ProcessMethod } from '@/constants/request'

/**
 * 직원 신청 1건. 구글시트 `6_신청기록` 한 행에 대응.
 * (총무팀 신청관리 화면에서 조회·처리)
 */
export interface RequestRow {
  /** 시트 실제 행번호(1-based). 처리 갱신 시 대상 식별에 사용. */
  rowIndex: number
  /** 신청일시(yyyy-MM-dd). */
  requestedAt: string
  /** 신청 종류(자산/반납/소모품). */
  kind: RequestKind | string
  /** 신청자. */
  requester: string
  /** 부서. */
  department: string
  /** 자산번호(반납신청 등). */
  assetNumber: string
  /** 대상명(자산구분/자산명/소모품명). */
  target: string
  /** 신청 사유. */
  reason: string
  /** 상세(스펙/희망일/수량 등). */
  detail: string
  /** 처리 상태. */
  status: RequestStatus
  /** 처리 방법(재고지급/구매요청/외부업체전달/기타). */
  method: ProcessMethod | ''
  /** 처리 메모. */
  note: string
  /** 처리일시(yyyy-MM-dd, 미처리면 빈 값). */
  processedAt: string
  /** 신청자 이메일(선택). */
  email?: string
  /** 신청 당시 현재 위치(선택). */
  location?: string
}

/** 신청 처리 갱신 요청 값(총무팀). */
export interface RequestUpdateValues {
  /** 대상 행번호. */
  rowIndex: number
  /** 변경할 상태. */
  status: RequestStatus
  /** 처리 방법. */
  method: ProcessMethod | ''
  /** 처리 메모. */
  note: string
}
