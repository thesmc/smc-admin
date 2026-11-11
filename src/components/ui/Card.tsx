import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import './Card.css'

/** {@link Card} 컴포넌트 props. */
interface CardProps {
  /** 카드 상단 제목. 생략 시 헤더 영역 자체를 렌더링하지 않습니다. */
  title?: string
  /** 제목 우측에 표시할 보조 액션 (예: '더보기' 링크). */
  action?: ReactNode
  /** 카드 본문 내용. */
  children: ReactNode
  /** 외부에서 레이아웃을 조정하기 위한 추가 className. */
  className?: string
  /** 접기/펼치기 가능 여부. true면 제목을 눌러 본문을 접을 수 있습니다. */
  collapsible?: boolean
  /** 접이식일 때 초기 펼침 상태(기본 true). */
  defaultOpen?: boolean
  /** 펼침 상태를 기억할 localStorage 키(생략 시 기억 안 함). */
  storageKey?: string
}

/** 저장된 펼침 상태를 읽습니다(없으면 defaultOpen). */
function readOpen(storageKey: string | undefined, defaultOpen: boolean): boolean {
  if (!storageKey) return defaultOpen
  try {
    const raw = localStorage.getItem(storageKey)
    return raw === null ? defaultOpen : raw === '1'
  } catch {
    return defaultOpen
  }
}

/**
 * 흰 배경 + 라운드 + 그림자를 가진 기본 패널 컨테이너.
 * 대시보드의 모든 위젯(차트/표/목록)을 감싸는 공통 틀입니다.
 * `collapsible`이면 제목을 눌러 본문을 접을 수 있고, `storageKey`로 상태를 기억합니다.
 *
 * @param props - {@link CardProps}
 * @returns 카드 엘리먼트
 */
export default function Card({
  title,
  action,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  storageKey,
}: CardProps) {
  const [open, setOpen] = useState<boolean>(() => readOpen(storageKey, defaultOpen))

  // 펼침 상태 변경 시 localStorage에 저장(키가 있을 때만)
  useEffect(() => {
    if (!collapsible || !storageKey) return
    try {
      localStorage.setItem(storageKey, open ? '1' : '0')
    } catch {
      // 저장 실패는 무시
    }
  }, [collapsible, storageKey, open])

  // title/action이 하나라도 있을 때만 헤더를 그려 불필요한 여백을 방지합니다.
  const hasHeader = Boolean(title || action)

  // 접이식: 제목을 버튼으로 만들어 토글, 셰브론으로 상태 표시. action은 토글과 분리.
  if (collapsible && hasHeader) {
    return (
      <section className={className ? `card ${className}` : 'card'}>
        <header className="card-head card-head-collapsible">
          <button
            type="button"
            className="card-toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown size={18} className={`card-chevron ${open ? 'open' : ''}`} />
            {title && <h3 className="card-title">{title}</h3>}
          </button>
          {action && <div className="card-action">{action}</div>}
        </header>
        {open && <div className="card-body">{children}</div>}
      </section>
    )
  }

  return (
    <section className={className ? `card ${className}` : 'card'}>
      {hasHeader && (
        <header className="card-head">
          {title && <h3 className="card-title">{title}</h3>}
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  )
}
