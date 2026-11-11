import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui'
import { FormField, SelectField, TextInput } from '@/components/form'
import LoadingState from '@/components/feedback/LoadingState'
import { useAssets } from '@/features/asset/useAssets'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { useMasterCodes } from '@/hooks/useMasterCodes'
import { downloadReportCsv, printReport, type ReportKind } from './reportExport'
import './ReportModal.css'

/** {@link ReportModal} 컴포넌트 props. */
interface ReportModalProps {
  /** 열림 여부. */
  open: boolean
  /** 닫기 콜백. */
  onClose: () => void
}

/** yyyymmdd 문자열(파일명용). */
function todayStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

/**
 * 자산 보고서 조회/내보내기 모달. (대시보드 '보고서 조회' 바로가기)
 * 전체 또는 자산등록 기간, 본부·부서·품목·사용자별로 필터링한 자산을
 * CSV(엑셀) 또는 인쇄(PDF로 저장)로 내보냅니다.
 *
 * @param props - {@link ReportModalProps}
 * @returns 보고서 모달
 */
export default function ReportModal({ open, onClose }: ReportModalProps) {
  const { assets, loading, usingMock } = useAssets()
  const { divisions, departmentOptions } = useOrgSettings()
  const { codes } = useMasterCodes()

  // 보고서 종류: 자산 명세 / 회계장부(감가상각)
  const [kind, setKind] = useState<ReportKind>('asset')
  // 필터 상태(모두 문자열 — 빈 값은 '전체'를 의미)
  const [periodOn, setPeriodOn] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [division, setDivision] = useState('')
  const [department, setDepartment] = useState('')
  const [category, setCategory] = useState('')
  const [user, setUser] = useState('')

  // 선택된 본부의 팀 목록(본부 미선택 시 전체 팀)
  const deptOptions = useMemo(() => {
    if (!division) return departmentOptions
    return divisions.find((d) => d.name === division)?.teams ?? []
  }, [division, divisions, departmentOptions])

  // 자산에 실제 등록된 사용자 목록(중복 제거·정렬)
  const userOptions = useMemo(() => {
    const set = new Set<string>()
    assets.forEach((a) => a.user && set.add(a.user))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [assets])

  // 필터 적용 결과
  const filtered = useMemo(() => {
    const teams = division ? (divisions.find((d) => d.name === division)?.teams ?? []) : null
    return assets.filter((a) => {
      if (periodOn) {
        if (dateFrom && (!a.acquiredDate || a.acquiredDate < dateFrom)) return false
        if (dateTo && (!a.acquiredDate || a.acquiredDate > dateTo)) return false
      }
      if (teams && !teams.includes(a.department)) return false
      if (department && a.department !== department) return false
      if (category && a.category !== category) return false
      if (user && a.user !== user) return false
      return true
    })
  }, [assets, periodOn, dateFrom, dateTo, division, department, category, user, divisions])

  /** 본부 변경 시 하위 부서 선택을 초기화합니다.(본부와 어긋나는 팀 방지) */
  function handleDivisionChange(next: string) {
    setDivision(next)
    setDepartment('')
  }

  /** 현재 필터를 사람이 읽는 요약 문장으로 만듭니다.(보고서 머리글) */
  function buildSummary(): string {
    const parts: string[] = []
    parts.push(periodOn ? `기간 ${dateFrom || '처음'}~${dateTo || '끝'}` : '전체 기간')
    if (division) parts.push(`본부 ${division}`)
    if (department) parts.push(`부서 ${department}`)
    if (category) parts.push(`품목 ${category}`)
    if (user) parts.push(`사용자 ${user}`)
    return parts.join(' · ')
  }

  const reportTitle = kind === 'ledger' ? 'The SMC 회계장부(감가상각)' : 'The SMC 자산 보고서'
  const fileBase = kind === 'ledger' ? '회계장부' : '자산보고서'

  function handleCsv() {
    if (filtered.length === 0) {
      window.alert('조건에 맞는 자산이 없습니다.')
      return
    }
    downloadReportCsv(filtered, kind, `${fileBase}_${todayStamp()}.csv`)
  }

  function handlePrint() {
    printReport(filtered, kind, {
      title: reportTitle,
      filterSummary: buildSummary(),
      generatedAt: new Date().toLocaleString('ko-KR'),
    })
  }

  return (
    <Modal open={open} title="보고서 조회 · 내보내기" onClose={onClose}>
      {loading && <LoadingState message="자산 데이터 불러오는 중…" />}
      {!loading && usingMock && (
        <p className="report-mock">※ 샘플(mock) 데이터 기준입니다. 실제 시트 연동 시 실데이터로 집계됩니다.</p>
      )}

      <div className="report-kind">
        <button
          type="button"
          className={`report-kind-tab ${kind === 'asset' ? 'active' : ''}`}
          onClick={() => setKind('asset')}
        >
          자산 명세
        </button>
        <button
          type="button"
          className={`report-kind-tab ${kind === 'ledger' ? 'active' : ''}`}
          onClick={() => setKind('ledger')}
        >
          회계장부(감가상각)
        </button>
      </div>
      {kind === 'ledger' && (
        <p className="report-ledger-note">
          취득자산·취득가액·내용연수·잔존가·폐기일자를 정액법(잔존가액 0, 기준일=오늘)으로 계산합니다.
          내용연수는 품목별 기본표(노트북·PC 4년 / 모니터·주변기기 5년 등)를 따릅니다.
        </p>
      )}

      <div className="report-filters">
        <FormField label="기간" htmlFor="rp-period">
          <label className="report-check">
            <input
              id="rp-period"
              type="checkbox"
              checked={periodOn}
              onChange={(e) => setPeriodOn(e.target.checked)}
            />
            <span>자산등록(취득일) 기간 지정 — 해제 시 전체 기간</span>
          </label>
        </FormField>

        {periodOn && (
          <div className="report-period">
            <FormField label="시작일" htmlFor="rp-from">
              <TextInput id="rp-from" type="date" value={dateFrom} onChange={setDateFrom} />
            </FormField>
            <FormField label="종료일" htmlFor="rp-to">
              <TextInput id="rp-to" type="date" value={dateTo} onChange={setDateTo} />
            </FormField>
          </div>
        )}

        <div className="report-grid">
          <FormField label="본부" htmlFor="rp-div">
            <SelectField
              id="rp-div"
              value={division}
              onChange={handleDivisionChange}
              options={divisions.map((d) => d.name)}
              placeholder="전체"
            />
          </FormField>
          <FormField label="부서(팀)" htmlFor="rp-dept">
            <SelectField
              id="rp-dept"
              value={department}
              onChange={setDepartment}
              options={deptOptions}
              placeholder="전체"
            />
          </FormField>
          <FormField label="품목(구분)" htmlFor="rp-cat">
            <SelectField
              id="rp-cat"
              value={category}
              onChange={setCategory}
              options={codes.categories}
              placeholder="전체"
            />
          </FormField>
          <FormField label="사용자" htmlFor="rp-user">
            <SelectField
              id="rp-user"
              value={user}
              onChange={setUser}
              options={userOptions}
              placeholder="전체"
            />
          </FormField>
        </div>
      </div>

      <div className="report-summary">
        <span className="report-summary-filter">{buildSummary()}</span>
        <span className="report-summary-count">
          조건에 맞는 자산 <b>{filtered.length}</b>건
        </span>
      </div>

      <div className="report-actions">
        <button type="button" className="report-btn" onClick={onClose}>
          닫기
        </button>
        <button type="button" className="report-btn" onClick={handleCsv} disabled={loading}>
          CSV(엑셀) 다운로드
        </button>
        <button type="button" className="report-btn primary" onClick={handlePrint} disabled={loading}>
          PDF(인쇄)로 저장
        </button>
      </div>
    </Modal>
  )
}
