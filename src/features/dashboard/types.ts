import type { AssetStatus } from '@/constants/asset'
import type { Consumable } from '@/types'

/** 자산 구분별 집계 1건 (도넛 차트용). */
export interface CategoryDatum {
  /** 자산 구분명. */
  category: string
  /** 해당 구분의 자산 수. */
  count: number
}

/** 신청 현황 목록의 한 행. (실데이터 `6_신청기록`의 종류/상태 문자열을 그대로 수용) */
export interface RequestItem {
  /** 신청 종류(예: 자산신청/소모품신청/반납신청/자산교체). */
  kind: string
  /** 신청 제목(요약). */
  title: string
  /** 신청일 (YYYY-MM-DD). */
  date: string
  /** 진행 상태(접수/처리중/완료/반려 등). */
  status: string
}

/** 최근 등록 자산 목록의 한 행. */
export interface RecentAssetItem {
  /** 자산번호. */
  assetNumber: string
  /** 자산명. */
  name: string
  /** 자산 구분. */
  category: string
  /** 취득일 (YYYY-MM-DD). */
  acquiredDate: string
  /** 사용자(부서 포함 표기). */
  user: string
  /** 자산 상태. */
  status: AssetStatus
}

/** 폐기 예정 자산 목록의 한 행. */
export interface DisposalItem {
  /** 자산번호. */
  assetNumber: string
  /** 자산명. */
  name: string
  /** 취득일 (YYYY-MM-DD). */
  acquiredDate: string
  /** 내용연수(년). 실데이터에 없으면 생략. */
  usefulLifeYears?: number
  /** 폐기 예정일 (YYYY-MM-DD). */
  disposalDate: string
  /** 폐기까지 남은 기준 일수. 실데이터에 없으면 생략. */
  withinDays?: number
}

/** 상단 KPI 카드용 핵심 지표. */
export interface DashboardStats {
  /** 전체 자산 수. */
  totalAssets: number
  /** 사용 중 자산 수. */
  inUseAssets: number
  /** 수리 중 자산 수. */
  repairingAssets: number
  /** 폐기 예정 자산 수. */
  disposalPlannedAssets: number
  /** 재고(구 '사용가능') 자산 수. */
  stockAssets: number
  /** 재고 부족 소모품 종류 수. */
  lowStockCount: number
}

/** 취득 구분(구매/렌탈) 집계. */
export interface AcquisitionSplit {
  /** 구매 자산 수. */
  purchase: number
  /** 렌탈 자산 수. */
  rental: number
}

/** 렌탈사별 집계 1건. */
export interface RentalCompanyDatum {
  /** 렌탈사명. */
  company: string
  /** 해당 렌탈사 자산 수. */
  count: number
  /** 진행중 렌탈의 월 렌탈료 합계(원). */
  cost?: number
}

/** 최근 이동/변경 이력 1건. (3_변경로그 파생) */
export interface ChangeLogItem {
  /** 변경 일시(yyyy-MM-dd). */
  at: string
  /** 구분(자산변경/자산배정/렌탈반납/수리접수). */
  kind: string
  /** 처리 담당자. */
  actor: string
  /** 대상(자산번호/접수번호). */
  target: string
  /** 변경 필드(상태/사용자/비용지출 등). */
  field: string
  /** 이전 값. */
  before: string
  /** 이후 값. */
  after: string
  /** 메모. */
  note: string
}

/** 관리자 대시보드 전체 데이터 묶음. (mock 또는 GAS 응답) */
export interface DashboardData {
  /** 상단 통계. */
  stats: DashboardStats
  /** 자산 구분별 집계. */
  categories: CategoryDatum[]
  /** 취득 구분(구매/렌탈) 집계. */
  acquisition: AcquisitionSplit
  /** 렌탈사별 집계. */
  rentalByCompany: RentalCompanyDatum[]
  /** 진행중 렌탈 월 비용 총합(원). */
  rentalMonthlyTotal?: number
  /** 신청 현황. */
  requests: RequestItem[]
  /** 소모품 재고 부족. */
  lowStock: Consumable[]
  /** 최근 등록 자산. */
  recentAssets: RecentAssetItem[]
  /** 최근 이동/변경 이력(반납·불출·상태변경). */
  recentChanges?: ChangeLogItem[]
  /** 폐기 예정 자산. */
  disposals: DisposalItem[]
}
