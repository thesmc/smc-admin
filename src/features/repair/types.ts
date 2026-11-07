import type { RepairPriority, RepairStatus } from '@/constants/repair'

/** 수리 접수 1건 (목록 뷰모델). GAS `?action=repairs` 응답과 일치. */
export interface RepairRow {
  /** 접수번호. */
  ticketNumber: string
  /** 접수일. */
  receivedAt: string
  /** 접수자. */
  requester: string
  /** 부서. */
  department: string
  /** 자산번호. */
  assetNumber: string
  /** 자산명. */
  assetName: string
  /** 증상. */
  symptom: string
  /** 우선순위. */
  priority: RepairPriority
  /** 진행 상태. */
  status: RepairStatus
  /** 담당자. */
  assignee: string
  /** 외부 수리업체 전달 여부(총무팀만 설정). */
  dispatched: boolean
  /** 첨부 사진 파일명(쉼표 구분). 실제 이미지 표시는 Drive 업로드 후 가능. */
  attachments: string
  /** 접수자 이메일(선택). */
  email?: string
  /** 접수 당시 현재 위치(선택). */
  location?: string
}

/** 수리 상태별 요약. */
export interface RepairSummary {
  /** 접수(대기). */
  received: number
  /** 수리 중. */
  inProgress: number
  /** 완료. */
  done: number
}

/** 수리 접수 수정 시 전송하는 필드. */
export interface RepairUpdatePayload {
  ticketNumber: string
  status: string
  assignee: string
}

/** 외부업체 전달 요청 필드. */
export interface RepairDispatchPayload {
  ticketNumber: string
}
