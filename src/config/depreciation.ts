import type { AssetRow } from '@/features/asset/types'

/**
 * 품목(구분)별 기본 내용연수(년). 회계장부(감가상각) 계산에 사용합니다.
 * 회사 기준이 다르면 이 표만 고치면 됩니다. (여기 없는 품목은 FALLBACK 사용)
 */
export const USEFUL_LIFE_YEARS: Record<string, number> = {
  노트북: 4,
  PC: 4,
  데스크톱: 4,
  데스크탑: 4,
  서버: 4,
  모니터: 5,
  프린터: 5,
  복합기: 5,
  주변기기: 5,
  네트워크: 5,
  가구: 8,
  비품: 5,
}

/** 표에 없는 품목의 기본 내용연수(년). */
export const FALLBACK_USEFUL_LIFE = 5

/**
 * 품목(구분)의 내용연수를 반환합니다. (부분일치 허용 — 예: 'PC_키보드'도 'PC'로 인식)
 * @param category - 자산 구분
 * @returns 내용연수(년)
 */
export function usefulLifeYears(category: string): number {
  const c = String(category || '')
  if (USEFUL_LIFE_YEARS[c] != null) return USEFUL_LIFE_YEARS[c]
  const key = Object.keys(USEFUL_LIFE_YEARS).find((k) => c.includes(k))
  return key ? USEFUL_LIFE_YEARS[key] : FALLBACK_USEFUL_LIFE
}

/** 감가상각 계산 결과. */
export interface Depreciation {
  /** 취득가액(숫자). */
  cost: number
  /** 내용연수(년). */
  usefulLife: number
  /** 경과 연수(소수). */
  elapsedYears: number
  /** 잔존가(정액법, 잔존가액 0, 폐기 시 0). */
  residual: number
  /** 폐기 여부. */
  disposed: boolean
}

/** 금액 문자열(예: '1,500,000원')을 숫자로 변환합니다. */
function parseAmount(value: string): number {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * 자산 1건의 감가상각(정액법)을 기준일 시점으로 계산합니다.
 * 잔존가 = 취득가 × max(0, 1 − 경과연수/내용연수), 폐기 자산은 0.
 *
 * @param asset - 자산
 * @param asOf - 기준일(기본 오늘)
 * @returns 감가상각 결과 ({@link Depreciation})
 */
export function computeDepreciation(asset: AssetRow, asOf: Date = new Date()): Depreciation {
  const cost = parseAmount(asset.purchaseAmount)
  const usefulLife = usefulLifeYears(asset.category)
  let elapsedYears = 0
  if (asset.acquiredDate) {
    const acq = new Date(asset.acquiredDate)
    if (!Number.isNaN(acq.getTime())) {
      elapsedYears = Math.max(0, (asOf.getTime() - acq.getTime()) / (365.25 * 24 * 3600 * 1000))
    }
  }
  const disposed = Boolean(asset.disposalDate) || asset.status === '폐기'
  const residual = disposed
    ? 0
    : Math.max(0, Math.round(cost * (1 - Math.min(1, elapsedYears / usefulLife))))
  return { cost, usefulLife, elapsedYears, residual, disposed }
}
