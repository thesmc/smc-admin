import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import { ACQUISITION_TYPES, ASSET_STATUSES } from '@/constants/asset'
import { useMasterCodes } from '@/hooks/useMasterCodes'
import { INITIAL_ASSET_FORM, type AssetRegisterFormValues } from './formConfig'
import { submitAssetRegisterBulk } from './submit'
import './AssetBulkRegisterModal.css'

/** 대량 등록 표에서 편집하는 필드(핵심 항목만). 나머지는 기본값으로 저장. */
type BulkRow = Pick<
  AssetRegisterFormValues,
  'name' | 'category' | 'manufacturer' | 'acquisitionType' | 'rentalCompany' | 'user' | 'location' | 'status'
>

/** 빈 행 하나. */
function emptyRow(): BulkRow {
  return { name: '', category: '', manufacturer: '', acquisitionType: '구매', rentalCompany: '', user: '', location: '', status: '재고' }
}

/** {@link AssetBulkRegisterModal} 컴포넌트 props. */
interface AssetBulkRegisterModalProps {
  /** 닫기 콜백. */
  onClose: () => void
  /** 등록 성공(1건 이상) 후 콜백. */
  onDone: () => void
}

/**
 * 자산 대량 등록 모달.
 * 여러 행을 표로 입력해 한 번에 등록합니다. 자산번호는 서버가 순번으로 발급합니다.
 * (핵심 항목만 입력 — 상세 정보는 등록 후 개별 수정)
 *
 * @param props - {@link AssetBulkRegisterModalProps}
 * @returns 대량 등록 모달
 */
export default function AssetBulkRegisterModal({ onClose, onDone }: AssetBulkRegisterModalProps) {
  const { codes } = useMasterCodes()
  const [rows, setRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow()])
  const [saving, setSaving] = useState(false)

  /** 특정 행의 한 필드를 갱신합니다. */
  function setCell(index: number, key: keyof BulkRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  }

  const validRows = rows.filter((r) => r.name.trim() !== '')

  /** 등록 제출. 이름이 있는 행만 전송합니다. */
  async function handleSubmit() {
    if (validRows.length === 0) {
      window.alert('자산명을 입력한 행이 없습니다.')
      return
    }
    // 편집 항목 + 기본값을 합쳐 완전한 폼 값으로 변환
    const payloads: AssetRegisterFormValues[] = validRows.map((r) => ({ ...INITIAL_ASSET_FORM, ...r }))
    setSaving(true)
    const result = await submitAssetRegisterBulk(payloads)
    setSaving(false)
    if (result.failed.length === 0) {
      window.alert(`${result.ok}건 등록되었습니다.\n목록을 새로고침하면 반영됩니다.`)
      onDone()
      onClose()
    } else {
      window.alert(`${result.ok}건 등록, ${result.failed.length}건 실패:\n${result.failed.join(', ')}`)
      if (result.ok > 0) onDone()
    }
  }

  const footer = (
    <>
      <button type="button" className="bulk-reg-btn" onClick={onClose} disabled={saving}>
        취소
      </button>
      <button type="button" className="bulk-reg-btn primary" onClick={handleSubmit} disabled={saving}>
        {saving ? '등록 중…' : `${validRows.length}건 등록`}
      </button>
    </>
  )

  return (
    <Modal open title="자산 대량 등록" onClose={onClose} footer={footer}>
      <p className="bulk-reg-desc">
        여러 자산을 한 번에 등록합니다. 자산명이 입력된 행만 저장되며, 자산번호는 자동 발급됩니다.
        상세 정보는 등록 후 개별 수정하세요.
      </p>

      <div className="bulk-reg-scroll">
        <table className="bulk-reg-table">
          <thead>
            <tr>
              <th className="req">자산명</th>
              <th>구분</th>
              <th>제조사</th>
              <th>취득</th>
              <th>렌탈사</th>
              <th>사용자</th>
              <th>위치</th>
              <th>상태</th>
              <th aria-label="행 삭제" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>
                  <input value={row.name} onChange={(e) => setCell(i, 'name', e.target.value)} placeholder="예: 노트북" />
                </td>
                <td>
                  <select value={row.category} onChange={(e) => setCell(i, 'category', e.target.value)}>
                    <option value="">-</option>
                    {codes.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input value={row.manufacturer} onChange={(e) => setCell(i, 'manufacturer', e.target.value)} />
                </td>
                <td>
                  <select value={row.acquisitionType} onChange={(e) => setCell(i, 'acquisitionType', e.target.value)}>
                    {ACQUISITION_TYPES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.rentalCompany}
                    onChange={(e) => setCell(i, 'rentalCompany', e.target.value)}
                    disabled={row.acquisitionType !== '렌탈'}
                  >
                    <option value="">-</option>
                    {codes.rentalCompanies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input value={row.user} onChange={(e) => setCell(i, 'user', e.target.value)} />
                </td>
                <td>
                  <input value={row.location} onChange={(e) => setCell(i, 'location', e.target.value)} />
                </td>
                <td>
                  <select value={row.status} onChange={(e) => setCell(i, 'status', e.target.value)}>
                    {ASSET_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="bulk-reg-del"
                    onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
                    aria-label="행 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="bulk-reg-add" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
        <Plus size={15} /> 행 추가
      </button>
    </Modal>
  )
}
