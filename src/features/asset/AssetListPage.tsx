import { useMemo, useState } from 'react'
import { Laptop, BadgeCheck, Wrench, Trash2, Plus, Search, ArrowUpDown, ScanLine, Layers } from 'lucide-react'
import { StatCard, Badge, Modal, Card, QrScannerModal, Pager } from '@/components/ui'
import LoadingState from '@/components/feedback/LoadingState'
import MockNotice from '@/components/feedback/MockNotice'
import EmptyState from '@/components/feedback/EmptyState'
import { getAssetStatusVariant } from '@/lib/badgeVariant'
import { ASSET_STATUSES } from '@/constants/asset'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { usePagination } from '@/hooks/usePagination'
import { useAssets } from './useAssets'
import { useAssetSelection } from './useAssetSelection'
import { useAssetBulkActions } from './useAssetBulkActions'
import AssetRegisterForm from './AssetRegisterForm'
import AssetBulkRegisterModal from './AssetBulkRegisterModal'
import AssetBulkBar from './AssetBulkBar'
import AssetDetailModal from './AssetDetailModal'
import type { AssetRow } from './types'
import './AssetListPage.css'

/** 취득 구분 필터 탭. */
const FILTERS = ['전체', '구매', '렌탈'] as const
type AssetFilter = (typeof FILTERS)[number]

/** 정렬 가능한 컬럼 키. */
type SortKey = 'assetNumber' | 'name' | 'category' | 'manufacturer' | 'user' | 'location' | 'acquiredDate' | 'status'

/**
 * 자산관리 모듈 메인 페이지. (관리자 데스크톱)
 * 요약 카드 + 취득구분 필터 + 검색 + 정렬 가능한 목록 표를 제공하고,
 * '자산 등록'은 모달로 처리합니다.
 *
 * @returns 자산관리 페이지
 */
export default function AssetListPage() {
  const { assets, summary, loading, usingMock, patchAsset } = useAssets()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [bulkRegOpen, setBulkRegOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [selected, setSelected] = useState<AssetRow | null>(null)
  const [filter, setFilter] = useState<AssetFilter>('전체')
  const [divisionFilter, setDivisionFilter] = useState('') // 본부 필터('' = 전체)
  const [userFilter, setUserFilter] = useState('') // 사용자 정확일치 필터('' = 전체)
  const [statusFilter, setStatusFilter] = useState('') // 상태 필터('' = 전체)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | ''>('')
  const [sortAsc, setSortAsc] = useState(true)
  // 다중 선택(대량 폐기·라벨 일괄 인쇄)
  const selection = useAssetSelection()
  const { divisions } = useOrgSettings()
  const { bulkBusy, handleBulkPrint, handleBulkDispose } = useAssetBulkActions(
    assets,
    selection,
    patchAsset,
  )

  // 필터 드롭다운 옵션: 데이터에 존재하는 사용자 목록(중복 제거·정렬)
  const userOptions = useMemo(
    () => Array.from(new Set(assets.map((a) => a.user).filter(Boolean))).sort((x, y) => x.localeCompare(y, 'ko')),
    [assets],
  )

  // 선택한 본부의 팀 집합(부서→본부 매핑). 본부 필터는 "그 본부 소속 부서의 자산만" 표시.
  const divisionTeams = useMemo(() => {
    if (!divisionFilter) return null
    return new Set(divisions.find((d) => d.name === divisionFilter)?.teams ?? [])
  }, [divisionFilter, divisions])

  // 취득구분 → 사용자 → 상태 → 검색어 → 정렬 순으로 목록을 가공합니다.
  const visibleAssets = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    let list = filter === '전체' ? assets : assets.filter((a) => a.acquisitionType === filter)

    // 본부 필터(선택 시): 그 본부에 속한 부서의 자산만
    if (divisionTeams) list = list.filter((a) => divisionTeams.has(a.department))
    // 사용자/상태 정확일치 필터(선택 시)
    if (userFilter) list = list.filter((a) => a.user === userFilter)
    if (statusFilter) list = list.filter((a) => a.status === statusFilter)

    if (keyword) {
      // 숫자로 들어오는 자산번호 등도 안전하게 문자열로 변환해 검색(널/언디파인드 방어).
      list = list.filter((a) => {
        const haystack = [
          a.assetNumber,
          a.name,
          a.user,
          a.managementNumber,
          a.rentalCompany,
          a.manufacturer,
          a.model,
          a.serialNumber,
          a.department,
          a.category,
          a.location,
        ]
          .map((v) => String(v ?? ''))
          .join(' ')
          .toLowerCase()
        return haystack.includes(keyword)
      })
    }

    if (sortKey) {
      // 문자열 기준 정렬(취득일은 YYYY-MM-DD라 사전순=날짜순)
      list = [...list].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), 'ko')
        return sortAsc ? cmp : -cmp
      })
    }
    return list
  }, [assets, filter, divisionTeams, userFilter, statusFilter, query, sortKey, sortAsc])

  // 20줄씩 페이지네이션. 필터/검색/정렬이 바뀌면 1페이지로 리셋.
  const { page, setPage, pageCount, pageItems, total } = usePagination(
    visibleAssets,
    20,
    `${filter}|${divisionFilter}|${userFilter}|${statusFilter}|${query}|${sortKey}|${sortAsc}`,
  )

  /**
   * QR 스캔 결과 처리. 디코드된 자산번호로 목록에서 자산을 찾아 상세를 엽니다.
   * @param text - 스캔된 문자열(자산번호)
   */
  function handleScanned(text: string) {
    setScanOpen(false)
    const code = text.trim()
    const found = assets.find((a) => a.assetNumber === code)
    if (found) {
      setSelected(found)
    } else {
      window.alert(`해당 자산을 찾을 수 없습니다: ${code}`)
    }
  }

  /**
   * 정렬 헤더 클릭 처리. 같은 열이면 방향 토글, 다른 열이면 오름차순으로 시작.
   * @param key - 정렬할 컬럼 키
   */
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  /** 정렬 가능한 th를 렌더링합니다. */
  function sortableHeader(key: SortKey, label: string, center = false) {
    const active = sortKey === key
    return (
      <th
        className={`sortable${center ? ' center' : ''}${active ? ' active' : ''}`}
        onClick={() => handleSort(key)}
      >
        {label}
        <ArrowUpDown size={12} className="sort-icon" />
        {active && <span className="sort-dir">{sortAsc ? '▲' : '▼'}</span>}
      </th>
    )
  }

  return (
    <>
      {loading && <LoadingState message="자산 목록 불러오는 중…" />}
      {!loading && usingMock && (
        <MockNotice message="샘플(mock) 데이터 표시 중 — 구글시트 연동 후 실제 자산이 표시됩니다." />
      )}

      <div className="asset-stat-row">
        <StatCard label="전체 자산" value={summary.total} unit="대" tone="blue" icon={<Laptop size={22} />} />
        <StatCard label="사용 중" value={summary.inUse} unit="대" tone="green" icon={<BadgeCheck size={22} />} />
        <StatCard label="수리 중" value={summary.repairing} unit="대" tone="orange" icon={<Wrench size={22} />} />
        <StatCard label="폐기 예정" value={summary.disposal} unit="대" tone="red" icon={<Trash2 size={22} />} />
      </div>

      <Card
        title="자산 목록"
        action={
          <div className="asset-actions">
            <button type="button" className="asset-scan-btn" onClick={() => setScanOpen(true)}>
              <ScanLine size={16} /> 스캔
            </button>
            <button type="button" className="asset-scan-btn" onClick={() => setBulkRegOpen(true)}>
              <Layers size={16} /> 대량 등록
            </button>
            <button type="button" className="asset-add-btn" onClick={() => setRegisterOpen(true)}>
              <Plus size={16} /> 자산 등록
            </button>
          </div>
        }
      >
        <div className="asset-toolbar">
          <div className="asset-filter-tabs">
            {FILTERS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={tab === filter ? 'asset-filter-tab active' : 'asset-filter-tab'}
                onClick={() => setFilter(tab)}
              >
                {tab}
                {tab !== '전체' && (
                  <span className="asset-filter-count">
                    {assets.filter((a) => a.acquisitionType === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 본부 필터: 긴 목록을 본부 단위로 좁혀 봄 */}
          <select
            className="asset-filter-select"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            aria-label="본부 필터"
          >
            <option value="">본부 전체</option>
            {divisions.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* 정확일치 필터: 사용자 / 상태 */}
          <select
            className="asset-filter-select"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            aria-label="사용자 필터"
          >
            <option value="">사용자 전체</option>
            {userOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            className="asset-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="상태 필터"
          >
            <option value="">상태 전체</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="asset-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="사용자·자산명·번호 검색 (예: 홍길동 → 그 사람 자산 전부)"
            />
            {query && (
              <button type="button" className="asset-search-clear" aria-label="검색 지우기" onClick={() => setQuery('')}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 검색/필터 결과 건수 안내(사용자 필터 시 그 사람 자산이 몇 건인지 바로 확인) */}
        {(query.trim() || divisionFilter || userFilter || statusFilter) && (
          <p className="asset-search-count">
            {divisionFilter && <>본부 <strong>{divisionFilter}</strong> · </>}
            {userFilter && <>사용자 <strong>{userFilter}</strong> · </>}
            {statusFilter && <>상태 {statusFilter} · </>}
            {query.trim() && <>‘{query.trim()}’ · </>}
            결과 <strong>{visibleAssets.length}건</strong>
            <button type="button" className="asset-filter-reset" onClick={() => { setDivisionFilter(''); setUserFilter(''); setStatusFilter(''); setQuery('') }}>
              필터 초기화
            </button>
          </p>
        )}

        <div className="asset-table-scroll">
          <table className="asset-table">
            <thead>
              <tr>
                <th className="check-col">
                  <input
                    type="checkbox"
                    aria-label="현재 목록 전체 선택"
                    checked={
                      visibleAssets.length > 0 &&
                      visibleAssets.every((a) => selection.isSelected(a.assetNumber))
                    }
                    onChange={() => selection.toggleAll(visibleAssets.map((a) => a.assetNumber))}
                  />
                </th>
                {sortableHeader('assetNumber', '자산번호')}
                {sortableHeader('name', '자산명')}
                {sortableHeader('category', '구분')}
                <th>취득</th>
                {sortableHeader('manufacturer', '제조사')}
                {sortableHeader('user', '사용자')}
                {sortableHeader('location', '위치')}
                {sortableHeader('acquiredDate', '취득일')}
                {sortableHeader('status', '상태', true)}
              </tr>
            </thead>
            <tbody>
              {visibleAssets.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={Laptop}
                      title={
                        query || filter !== '전체' || divisionFilter || userFilter || statusFilter
                          ? '조건에 맞는 자산이 없습니다.'
                          : '등록된 자산이 없습니다.'
                      }
                      hint={
                        query || filter !== '전체' || divisionFilter || userFilter || statusFilter
                          ? '검색어·필터를 바꿔보세요.'
                          : '우측 상단 ‘자산 등록’으로 추가하세요.'
                      }
                    />
                  </td>
                </tr>
              )}
              {pageItems.map((asset: AssetRow, index) => (
                <tr
                  // 자산번호가 비었거나 중복인 데이터가 많아, 인덱스를 더해 key 중복(리스트 잔상) 방지
                  key={`${asset.assetNumber || asset.name}-${index}`}
                  className="asset-row"
                  onClick={() => setSelected(asset)}
                >
                  <td className="check-col" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`${asset.assetNumber} 선택`}
                      checked={selection.isSelected(asset.assetNumber)}
                      onChange={() => selection.toggle(asset.assetNumber)}
                    />
                  </td>
                  <td>{asset.assetNumber}</td>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>
                    {asset.acquisitionType === '렌탈' ? `렌탈 (${asset.rentalCompany})` : '구매'}
                  </td>
                  <td>{asset.manufacturer}</td>
                  <td>{asset.user}</td>
                  <td>{asset.location}</td>
                  <td>{asset.acquiredDate}</td>
                  <td className="center">
                    <Badge variant={getAssetStatusVariant(asset.status)}>{asset.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pager page={page} pageCount={pageCount} onChange={setPage} total={total} />
      </Card>

      <Modal open={registerOpen} title="자산 등록" onClose={() => setRegisterOpen(false)}>
        <AssetRegisterForm onSuccess={() => setRegisterOpen(false)} />
      </Modal>

      {bulkRegOpen && (
        <AssetBulkRegisterModal onClose={() => setBulkRegOpen(false)} onDone={() => { /* 목록은 새로고침 시 반영 */ }} />
      )}

      <AssetBulkBar
        count={selection.count}
        onPrint={handleBulkPrint}
        onDispose={handleBulkDispose}
        onClear={selection.clear}
        busy={bulkBusy}
      />

      {scanOpen && <QrScannerModal onClose={() => setScanOpen(false)} onDetected={handleScanned} />}

      {/* 선택 시에만 마운트 + key로 자산별 초기값을 새로 반영 */}
      {selected && (
        <AssetDetailModal
          key={selected.assetNumber}
          asset={selected}
          onClose={() => setSelected(null)}
          onSaved={(assetNumber, patch) => patchAsset(assetNumber, patch)}
        />
      )}
    </>
  )
}
