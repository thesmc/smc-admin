import { useState } from 'react'
import { Modal, Badge } from '@/components/ui'
import { FormField, TextInput, SelectField } from '@/components/form'
import { useForm } from '@/hooks/useForm'
import { getAssetStatusVariant } from '@/lib/badgeVariant'
import { ASSET_STATUSES, type AssetStatus } from '@/constants/asset'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { updateAsset, returnRental } from './api'
import { printAssetLabel } from './labelPrint'
import type { AssetRow } from './types'
import './AssetDetailModal.css'

/** 금액 문자열(원)을 천단위 콤마로 표기. 빈 값이면 '-'. */
function won(value: string): string {
  const n = Number(value)
  return value && !Number.isNaN(n) ? `${n.toLocaleString('ko-KR')}원` : '-'
}

/** {@link AssetDetailModal} 컴포넌트 props. */
interface AssetDetailModalProps {
  /** 표시/편집할 자산. null이면 닫힘. */
  asset: AssetRow | null
  /** 닫기 콜백. */
  onClose: () => void
  /** 저장 성공 시 로컬 목록 갱신 콜백. */
  onSaved: (assetNumber: string, patch: Partial<AssetRow>) => void
}

/** 읽기 모드에서 보여줄 (라벨, 값) 목록을 만듭니다. */
function readRows(a: AssetRow): Array<[string, string]> {
  const acquisition = a.acquisitionType === '렌탈' ? `렌탈 (${a.rentalCompany})` : '구매'
  const rows: Array<[string, string]> = [
    ['자산번호', a.assetNumber],
    ['취득 구분', acquisition],
    ['자산 분류', a.category],
    ['제조사', a.manufacturer],
    ['모델명', a.model],
    ['시리얼', a.serialNumber],
    ['관리번호', a.managementNumber],
    ['키값', a.keyValue],
    ['취득일', a.acquiredDate],
    ['보증기간', a.warrantyUntil],
  ]
  // 렌탈 자산이면 비용/계약/반납 정보를 함께 노출
  if (a.acquisitionType === '렌탈') {
    rows.push(['월 렌탈료', won(a.monthlyRent)])
    rows.push(['계약기간', a.contractStart || a.contractEnd ? `${a.contractStart || '?'} ~ ${a.contractEnd || '?'}` : '-'])
    rows.push(['반납일', a.returnDate ? `${a.returnDate} (비용종료)` : '미반납(진행중)'])
  }
  return rows
}

/**
 * 자산 상세보기 + 수정 모달.
 * 읽기 모드에서 전체 정보를 보여주고, '수정'을 누르면 운영 정보
 * (사용자/부서/위치/상태/담당자/비고/폐기일)를 편집해 GAS로 저장합니다.
 *
 * @param props - {@link AssetDetailModalProps}
 * @returns 상세/수정 모달 (asset이 null이면 렌더 안 함)
 */
export default function AssetDetailModal({ asset, onClose, onSaved }: AssetDetailModalProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { departmentOptions, locations } = useOrgSettings()
  const { values, setField } = useForm({
    user: asset?.user ?? '',
    department: asset?.department ?? '',
    location: asset?.location ?? '',
    status: asset?.status ?? '사용중',
    manager: asset?.manager ?? '',
    note: asset?.note ?? '',
    disposalDate: asset?.disposalDate ?? '',
    monthlyRent: asset?.monthlyRent ?? '',
    contractStart: asset?.contractStart ?? '',
    contractEnd: asset?.contractEnd ?? '',
  })

  if (!asset) return null

  const isRental = asset.acquisitionType === '렌탈'
  const returned = !!asset.returnDate

  /** 저장 처리. GAS 수정 요청 후 성공하면 로컬 목록을 갱신합니다. */
  async function handleSave() {
    if (!asset) return
    // 렌탈 비용 필드는 렌탈 자산일 때만 전송(구매 자산 값 덮어쓰기 방지)
    const rentalPatch = isRental
      ? { monthlyRent: values.monthlyRent, contractStart: values.contractStart, contractEnd: values.contractEnd }
      : {}
    setSaving(true)
    const result = await updateAsset({ assetNumber: asset.assetNumber, ...values, ...rentalPatch })
    setSaving(false)
    if (result.ok) {
      onSaved(asset.assetNumber, { ...values, ...rentalPatch })
      setEditing(false)
    } else {
      window.alert(`저장 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  /** 렌탈 반납 처리. 반납일을 기록하고 '비용지출 종료' 이력을 남깁니다. */
  async function handleRentalReturn() {
    if (!asset) return
    if (!window.confirm('이 렌탈 자산을 반납 처리할까요?\n반납일이 오늘로 기록되고 월 렌탈 비용 지출이 종료됩니다.')) {
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    setSaving(true)
    const result = await returnRental({
      assetNumber: asset.assetNumber,
      monthlyRent: asset.monthlyRent,
      rentalCompany: asset.rentalCompany,
      manager: asset.manager,
    })
    setSaving(false)
    if (result.ok) {
      onSaved(asset.assetNumber, { returnDate: today })
      onClose()
    } else {
      window.alert(`반납 처리 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  /**
   * 반납 처리(원클릭). 사용자가 자산을 반납(예: 퇴사)했을 때 호출합니다.
   * 상태를 '재고'로 바꾸고 사용자·부서 배정을 해제합니다.
   */
  async function handleReturn() {
    if (!asset) return
    if (!window.confirm('이 자산을 반납 처리할까요?\n상태가 "재고"로 바뀌고 사용자 배정이 해제됩니다.')) {
      return
    }
    setSaving(true)
    const result = await updateAsset({
      assetNumber: asset.assetNumber,
      user: '',
      department: '',
      location: asset.location,
      status: '재고',
      manager: asset.manager,
      note: asset.note,
      disposalDate: '',
    })
    setSaving(false)
    if (result.ok) {
      onSaved(asset.assetNumber, { status: '재고', user: '', department: '' })
      onClose()
    } else {
      window.alert(`반납 처리 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  /**
   * 폐기 처리(원클릭). 상태를 '폐기'로, 폐기일을 오늘로 설정하고 저장합니다.
   * 기존 사용자/부서/위치/담당자/비고는 그대로 보존해 전송합니다(빈값 덮어쓰기 방지).
   */
  async function handleDispose() {
    if (!asset) return
    if (!window.confirm('이 자산을 폐기 처리할까요?\n상태가 "폐기"로 바뀌고 폐기일이 오늘로 기록됩니다.')) {
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    setSaving(true)
    const result = await updateAsset({
      assetNumber: asset.assetNumber,
      user: asset.user,
      department: asset.department,
      location: asset.location,
      status: '폐기',
      manager: asset.manager,
      note: asset.note,
      disposalDate: today,
    })
    setSaving(false)
    if (result.ok) {
      onSaved(asset.assetNumber, { status: '폐기', disposalDate: today })
      onClose()
    } else {
      window.alert(`폐기 처리 실패: ${result.message ?? '알 수 없는 오류'}`)
    }
  }

  const footer = editing ? (
    <>
      <button type="button" className="detail-btn" onClick={() => setEditing(false)} disabled={saving}>
        취소
      </button>
      <button type="button" className="detail-btn primary" onClick={handleSave} disabled={saving}>
        {saving ? '저장 중…' : '저장'}
      </button>
    </>
  ) : (
    <>
      <div className="detail-actions-left">
        <button type="button" className="detail-btn" onClick={() => printAssetLabel(asset)}>
          라벨 인쇄
        </button>
        {asset.status === '사용중' && (
          <button type="button" className="detail-btn" onClick={handleReturn} disabled={saving}>
            반납 처리
          </button>
        )}
        {isRental && !returned && asset.status !== '폐기' && (
          <button type="button" className="detail-btn" onClick={handleRentalReturn} disabled={saving}>
            렌탈 반납
          </button>
        )}
        {asset.status !== '폐기' && (
          <button type="button" className="detail-btn danger" onClick={handleDispose} disabled={saving}>
            폐기 처리
          </button>
        )}
      </div>
      <button type="button" className="detail-btn" onClick={onClose}>
        닫기
      </button>
      <button type="button" className="detail-btn primary" onClick={() => setEditing(true)}>
        수정
      </button>
    </>
  )

  return (
    <Modal open title={`${asset.assetNumber || '자산'} · ${asset.name}`} onClose={onClose} footer={footer}>
      {!editing ? (
        <>
          <dl className="detail-grid">
            {readRows(asset).map(([label, value]) => (
              <div key={label} className="detail-item">
                <dt>{label}</dt>
                <dd>{value || '-'}</dd>
              </div>
            ))}
            <div className="detail-item">
              <dt>상태</dt>
              <dd>
                <Badge variant={getAssetStatusVariant(asset.status)}>{asset.status}</Badge>
              </dd>
            </div>
          </dl>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>사용자</dt>
              <dd>{asset.user || '-'}</dd>
            </div>
            <div className="detail-item">
              <dt>부서</dt>
              <dd>{asset.department || '-'}</dd>
            </div>
            <div className="detail-item">
              <dt>위치</dt>
              <dd>{asset.location || '-'}</dd>
            </div>
            <div className="detail-item">
              <dt>관리 담당자</dt>
              <dd>{asset.manager || '-'}</dd>
            </div>
            <div className="detail-item detail-full">
              <dt>비고</dt>
              <dd>{asset.note || '-'}</dd>
            </div>
            {asset.disposalDate && (
              <div className="detail-item">
                <dt>폐기일</dt>
                <dd>{asset.disposalDate}</dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <div className="detail-edit">
          <FormField label="사용자" htmlFor="d-user">
            <TextInput id="d-user" value={values.user} onChange={(v) => setField('user', v)} />
          </FormField>
          <FormField label="부서" htmlFor="d-dept">
            <SelectField
              id="d-dept"
              value={values.department}
              onChange={(v) => setField('department', v)}
              options={departmentOptions}
            />
          </FormField>
          <FormField label="위치" htmlFor="d-loc">
            <SelectField
              id="d-loc"
              value={values.location}
              onChange={(v) => setField('location', v)}
              options={locations}
            />
          </FormField>
          <FormField label="상태" htmlFor="d-status" required>
            <SelectField
              id="d-status"
              value={values.status}
              onChange={(v) => setField('status', v as AssetStatus)}
              options={ASSET_STATUSES}
            />
          </FormField>
          <FormField label="관리 담당자" htmlFor="d-manager">
            <TextInput id="d-manager" value={values.manager} onChange={(v) => setField('manager', v)} />
          </FormField>
          {/* 폐기 상태일 때만 폐기일 입력 */}
          {(values.status === '폐기' || values.status === '폐기예정') && (
            <FormField label="폐기일" htmlFor="d-disposal">
              <TextInput
                id="d-disposal"
                type="date"
                value={values.disposalDate}
                onChange={(v) => setField('disposalDate', v)}
              />
            </FormField>
          )}
          {/* 렌탈 자산이면 비용/계약 정보도 편집 */}
          {isRental && (
            <>
              <FormField label="월 렌탈료 (원)" htmlFor="d-rent">
                <TextInput
                  id="d-rent"
                  type="number"
                  value={values.monthlyRent}
                  onChange={(v) => setField('monthlyRent', v)}
                />
              </FormField>
              <FormField label="계약 시작일" htmlFor="d-cstart">
                <TextInput
                  id="d-cstart"
                  type="date"
                  value={values.contractStart}
                  onChange={(v) => setField('contractStart', v)}
                />
              </FormField>
              <FormField label="계약 종료일" htmlFor="d-cend">
                <TextInput
                  id="d-cend"
                  type="date"
                  value={values.contractEnd}
                  onChange={(v) => setField('contractEnd', v)}
                />
              </FormField>
            </>
          )}
          <FormField label="비고" htmlFor="d-note" fullWidth>
            <TextInput id="d-note" value={values.note} onChange={(v) => setField('note', v)} />
          </FormField>
        </div>
      )}
    </Modal>
  )
}
