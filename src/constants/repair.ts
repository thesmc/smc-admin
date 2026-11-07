/**
 * 수리 접수 우선순위(긴급도). 값의 나열 순서가 곧 심각도 순서입니다.
 * (긴급 > 높음 > 보통 > 낮음)
 */
export const REPAIR_PRIORITIES = ['긴급', '높음', '보통', '낮음'] as const

/** 우선순위 유니온 타입. */
export type RepairPriority = (typeof REPAIR_PRIORITIES)[number]

/**
 * 수리 접수 진행 상태. 접수 → 확인 → 수리중 → 완료 순으로 전이됩니다.
 * ('확인'은 외부업체/담당자가 요청을 접수 확인한 단계)
 */
export const REPAIR_STATUSES = ['접수', '확인', '수리중', '완료'] as const

/** 진행 상태 유니온 타입. */
export type RepairStatus = (typeof REPAIR_STATUSES)[number]
