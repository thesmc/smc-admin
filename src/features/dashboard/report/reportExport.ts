import type { AssetRow } from '@/features/asset/types'
import { computeDepreciation } from '@/config/depreciation'

/** 보고서에 함께 표기할 메타 정보(제목·필터 요약·생성시각). */
export interface ReportMeta {
  /** 보고서 제목. */
  title: string
  /** 적용된 필터 요약 문장. */
  filterSummary: string
  /** 생성 시각(사람이 읽는 형식). */
  generatedAt: string
}

/** 보고서 컬럼(헤더 + 자산에서 값 추출). */
interface Column {
  header: string
  get: (a: AssetRow) => string
}

/** CSV 셀 하나를 이스케이프합니다. (쉼표·따옴표·줄바꿈 방어) */
function csvCell(value: string): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** HTML 특수문자 이스케이프. (인쇄용 표 안전 삽입) */
function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 숫자를 천단위 콤마 금액 문자열로. */
function won(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

// ===== 컬럼 정의 =====

/** 자산 보고서(전체 명세) 컬럼. */
const ASSET_COLUMNS: Column[] = [
  { header: '자산번호', get: (a) => a.assetNumber },
  { header: '자산명', get: (a) => a.name },
  { header: '구분', get: (a) => a.category },
  { header: '제조사', get: (a) => a.manufacturer },
  { header: '모델', get: (a) => a.model },
  { header: '시리얼', get: (a) => a.serialNumber },
  { header: '취득구분', get: (a) => a.acquisitionType },
  { header: '렌탈사', get: (a) => a.rentalCompany },
  { header: '취득일', get: (a) => a.acquiredDate },
  { header: '구매금액', get: (a) => a.purchaseAmount },
  { header: '사용자', get: (a) => a.user },
  { header: '부서', get: (a) => a.department },
  { header: '위치', get: (a) => a.location },
  { header: '상태', get: (a) => a.status },
  { header: '관리담당자', get: (a) => a.manager },
  { header: '비고', get: (a) => a.note },
]

/** 자산 보고서 인쇄용 축약 컬럼. */
const ASSET_PRINT_COLUMNS = ASSET_COLUMNS.filter((c) =>
  ['자산번호', '자산명', '구분', '취득구분', '취득일', '사용자', '부서', '위치', '상태'].includes(c.header),
)

/** 회계장부(감가상각) 컬럼. 취득자산·취득가액·잔존가·내용연수·폐기일자. 정액법·기준일=오늘. */
const LEDGER_COLUMNS: Column[] = [
  { header: '자산번호', get: (a) => a.assetNumber },
  { header: '취득자산', get: (a) => a.name },
  { header: '구분', get: (a) => a.category },
  { header: '취득일', get: (a) => a.acquiredDate },
  { header: '취득가액', get: (a) => won(computeDepreciation(a).cost) },
  { header: '내용연수', get: (a) => `${computeDepreciation(a).usefulLife}년` },
  { header: '경과연수', get: (a) => `${computeDepreciation(a).elapsedYears.toFixed(1)}년` },
  { header: '잔존가', get: (a) => won(computeDepreciation(a).residual) },
  { header: '폐기일자', get: (a) => a.disposalDate },
]

/** 보고서 종류. */
export type ReportKind = 'asset' | 'ledger'

/** 종류별 컬럼(CSV=전체, 인쇄=축약). */
function columnsFor(kind: ReportKind): { csv: Column[]; print: Column[] } {
  if (kind === 'ledger') return { csv: LEDGER_COLUMNS, print: LEDGER_COLUMNS }
  return { csv: ASSET_COLUMNS, print: ASSET_PRINT_COLUMNS }
}

// ===== 내보내기 =====

/**
 * 선택한 종류의 보고서를 CSV(엑셀) 파일로 내려받습니다.
 * Excel 한글 깨짐 방지를 위해 UTF-8 BOM(0xFEFF)을 앞에 붙입니다.
 *
 * @param rows - 내보낼 자산 목록(이미 필터 적용됨)
 * @param kind - 보고서 종류(asset|ledger)
 * @param filename - 저장 파일명(.csv 포함)
 */
export function downloadReportCsv(rows: AssetRow[], kind: ReportKind, filename: string): void {
  const columns = columnsFor(kind).csv
  const lines = [columns.map((c) => c.header).join(',')]
  for (const a of rows) lines.push(columns.map((c) => csvCell(c.get(a))).join(','))
  const bom = String.fromCharCode(0xfeff)
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * 선택한 종류의 보고서를 새 창에 표로 그린 뒤 인쇄 대화상자를 엽니다.
 * 사용자는 '인쇄' 대화상자에서 'PDF로 저장'을 선택해 PDF를 받습니다.
 *
 * @param rows - 인쇄할 자산 목록(이미 필터 적용됨)
 * @param kind - 보고서 종류(asset|ledger)
 * @param meta - 제목·필터 요약·생성시각
 */
export function printReport(rows: AssetRow[], kind: ReportKind, meta: ReportMeta): void {
  const win = window.open('', '_blank', 'width=1000,height=720')
  if (!win) {
    window.alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.')
    return
  }

  const columns = columnsFor(kind).print
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('')
  const body = rows
    .map((a) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.get(a))}</td>`).join('')}</tr>`)
    .join('\n')

  const note =
    kind === 'ledger'
      ? '<div class="meta">※ 정액법·잔존가액 0·기준일=오늘 기준 계산값입니다. 내용연수는 품목별 기본표를 따릅니다.</div>'
      : ''

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<title>${escapeHtml(meta.title)}</title>
<style>
  * { box-sizing: border-box; font-family: -apple-system, 'Malgun Gothic', sans-serif; }
  body { margin: 24px; color: #1f2937; }
  h1 { font-size: 18pt; margin: 0 0 4px; }
  .meta { font-size: 10pt; color: #6b7280; margin-bottom: 2px; }
  .count { font-size: 10pt; color: #111827; font-weight: 700; margin: 6px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; white-space: nowrap; }
  th { background: #f3f4f6; font-weight: 700; }
  tr:nth-child(even) td { background: #fafafa; }
  .empty { padding: 24px; text-align: center; color: #6b7280; }
  .actions { margin-top: 16px; }
  .actions button { padding: 8px 18px; font-size: 14px; font-weight: 700;
    background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
  @page { size: A4 landscape; margin: 12mm; }
  @media print { .actions { display: none; } body { margin: 0; } }
</style></head><body>
  <h1>${escapeHtml(meta.title)}</h1>
  <div class="meta">${escapeHtml(meta.filterSummary)}</div>
  <div class="meta">생성: ${escapeHtml(meta.generatedAt)}</div>
  ${note}
  <div class="count">총 ${rows.length}건</div>
  ${
    rows.length === 0
      ? '<div class="empty">조건에 맞는 자산이 없습니다.</div>'
      : `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  }
  <div class="actions"><button onclick="window.print()">인쇄 / PDF로 저장</button></div>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 400) }</script>
</body></html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
}
