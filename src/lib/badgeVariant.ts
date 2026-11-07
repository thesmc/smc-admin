import type { BadgeVariant } from '@/components/ui'
import type { AssetStatus } from '@/constants/asset'
import type { RepairStatus } from '@/constants/repair'
import type { RequestStatus } from '@/constants/request'

/**
 * 자산 상태 → 뱃지 색상 매핑.
 *
 * `Record<AssetStatus, ...>` 로 선언한 이유: 새 상태가 추가되면
 * 이 매핑에서 누락된 키를 TypeScript가 컴파일 에러로 잡아주어
 * "색 지정을 깜빡하는" 실수를 원천 차단하기 위함입니다.
 */
const ASSET_STATUS_VARIANT: Record<AssetStatus, BadgeVariant> = {
  사용중: 'success',
  사용가능: 'info',
  수리중: 'warning',
  폐기예정: 'danger',
  폐기: 'neutral',
}

/**
 * 자산 상태에 대응하는 뱃지 색상 변형을 반환합니다.
 * @param status - 자산 상태
 * @returns 뱃지 색상 변형
 */
export function getAssetStatusVariant(status: AssetStatus): BadgeVariant {
  return ASSET_STATUS_VARIANT[status]
}

/** 수리 진행 상태 → 뱃지 색상 매핑. (누락 방지를 위해 Record 사용) */
const REPAIR_STATUS_VARIANT: Record<RepairStatus, BadgeVariant> = {
  접수: 'info',
  확인: 'info',
  수리중: 'warning',
  완료: 'success',
}

/**
 * 수리 진행 상태에 대응하는 뱃지 색상 변형을 반환합니다.
 * @param status - 수리 진행 상태
 * @returns 뱃지 색상 변형
 */
export function getRepairStatusVariant(status: RepairStatus): BadgeVariant {
  return REPAIR_STATUS_VARIANT[status]
}

/** 신청 처리 상태 → 뱃지 색상 매핑. (누락 방지를 위해 Record 사용) */
const REQUEST_STATUS_VARIANT: Record<RequestStatus, BadgeVariant> = {
  접수: 'info',
  처리중: 'warning',
  완료: 'success',
  반려: 'danger',
}

/**
 * 신청 처리 상태에 대응하는 뱃지 색상 변형을 반환합니다.
 * @param status - 신청 처리 상태
 * @returns 뱃지 색상 변형
 */
export function getRequestStatusVariant(status: RequestStatus): BadgeVariant {
  return REQUEST_STATUS_VARIANT[status]
}
