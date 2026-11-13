import { useEffect, useMemo, useState } from 'react'

/** {@link usePagination} 반환 타입. */
export interface Pagination<T> {
  /** 현재 페이지(1-based). */
  page: number
  /** 페이지 이동. */
  setPage: (page: number) => void
  /** 전체 페이지 수(최소 1). */
  pageCount: number
  /** 현재 페이지에 보여줄 항목들. */
  pageItems: T[]
  /** 전체 항목 수. */
  total: number
  /** 현재 페이지 첫 항목의 0-based 인덱스(번호 표시용). */
  start: number
  /** 페이지당 항목 수. */
  pageSize: number
}

/**
 * 배열을 페이지 단위로 잘라 주는 공통 훅. (자산·사용자 목록 등 긴 표에 사용)
 *
 * @remarks
 * - `resetKey`가 바뀌면(필터/검색 변경 등) 1페이지로 되돌립니다.
 * - 목록이 줄어 현재 페이지가 범위를 벗어나면 자동으로 보정합니다.
 *
 * @typeParam T - 항목 타입
 * @param items - 전체(필터링된) 항목 배열
 * @param pageSize - 페이지당 항목 수(기본 20)
 * @param resetKey - 값이 바뀌면 1페이지로 리셋(예: 필터·검색 상태 문자열)
 * @returns 페이지 상태와 현재 페이지 항목({@link Pagination})
 */
export function usePagination<T>(items: T[], pageSize = 20, resetKey?: unknown): Pagination<T> {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  // 필터/검색이 바뀌면 1페이지부터 다시 본다.
  useEffect(() => {
    setPage(1)
  }, [resetKey])

  // 목록이 줄어 현재 페이지가 비어버리면 마지막 유효 페이지로 보정.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const start = (Math.min(page, pageCount) - 1) * pageSize
  const pageItems = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize])

  return { page: Math.min(page, pageCount), setPage, pageCount, pageItems, total: items.length, start, pageSize }
}
