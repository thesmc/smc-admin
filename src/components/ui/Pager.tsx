import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Pager.css'

/** {@link Pager} 컴포넌트 props. */
interface PagerProps {
  /** 현재 페이지(1-based). */
  page: number
  /** 전체 페이지 수. */
  pageCount: number
  /** 페이지 이동 콜백. */
  onChange: (page: number) => void
  /** 전체 항목 수(결과 건수 표시용, 선택). */
  total?: number
}

/**
 * 표 하단 페이지네이션 바. 페이지가 1개뿐이면 렌더하지 않습니다.
 * 페이지가 많으면 현재 페이지 주변 + 처음/끝만 보여주고 사이는 '…'으로 생략합니다.
 *
 * @param props - {@link PagerProps}
 * @returns 페이지 버튼 바(페이지 1개면 null)
 */
export default function Pager({ page, pageCount, onChange, total }: PagerProps) {
  if (pageCount <= 1) return null

  // 표시할 페이지 번호 목록(현재 기준 앞뒤 2개 + 처음/끝, 사이는 생략 마커 -1)
  const nums: number[] = []
  const add = (n: number) => {
    if (n >= 1 && n <= pageCount && !nums.includes(n)) nums.push(n)
  }
  add(1)
  for (let n = page - 2; n <= page + 2; n++) add(n)
  add(pageCount)
  nums.sort((a, b) => a - b)

  // 연속되지 않은 구간에 생략 마커(-1) 삽입
  const items: number[] = []
  nums.forEach((n, idx) => {
    if (idx > 0 && n - nums[idx - 1] > 1) items.push(-1)
    items.push(n)
  })

  return (
    <nav className="pager" aria-label="페이지 이동">
      {typeof total === 'number' && <span className="pager-total">총 {total.toLocaleString('ko-KR')}건</span>}
      <div className="pager-btns">
        <button
          type="button"
          className="pager-btn"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={16} />
        </button>
        {items.map((n, idx) =>
          n === -1 ? (
            <span key={`gap-${idx}`} className="pager-gap">
              …
            </span>
          ) : (
            <button
              type="button"
              key={n}
              className={n === page ? 'pager-btn active' : 'pager-btn'}
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className="pager-btn"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="다음 페이지"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
