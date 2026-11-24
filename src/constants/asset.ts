/**
 * 자산 구분(카테고리) 목록. 관리자 대시보드의 도넛 차트 분류 기준입니다.
 */
export const ASSET_CATEGORIES = ['노트북', '모니터', '데스크탑', '프린터', '기타'] as const

/** 자산 구분 유니온 타입. */
export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

/**
 * 자산 상태 값. 자산의 생애주기(사용 → 수리 → 폐기)를 나타냅니다.
 */
export const ASSET_STATUSES = ['사용중', '재고', '수리중', '폐기예정', '폐기'] as const

/** 자산 상태 유니온 타입. */
export type AssetStatus = (typeof ASSET_STATUSES)[number]

/**
 * 취득 구분. 회사는 자산을 구매하기도 하지만 노트북 등은 주로 렌탈로 보유한다.
 */
export const ACQUISITION_TYPES = ['구매', '렌탈'] as const

/** 취득 구분 유니온 타입. */
export type AcquisitionType = (typeof ACQUISITION_TYPES)[number]

/**
 * 렌탈사 목록. 현재 롯데렌탈·AI네트웍스와 계약.
 * (추후 시스템설정/Master에서 추가·수정 가능하게 이관 — 코드 수정 없이 확장)
 */
export const RENTAL_COMPANIES = ['롯데렌탈', 'AJ네트웍스'] as const

/** 렌탈사 유니온 타입. */
export type RentalCompany = (typeof RENTAL_COMPANIES)[number]
