import { useEffect, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { Card } from '@/components/ui'
import { useMasterCodes } from '@/hooks/useMasterCodes'
import type { MasterCodes } from '@/config/masterDefaults'
import StringListEditor from './StringListEditor'
import './MasterPage.css'

/** 편집 가능한 코드 그룹 정의(레이블 + 키 + 자리표시). */
const GROUPS: Array<{ key: keyof MasterCodes; label: string; placeholder: string }> = [
  { key: 'categories', label: '자산 구분', placeholder: '예: 노트북' },
  { key: 'rentalCompanies', label: '렌탈사', placeholder: '예: 롯데렌탈' },
  { key: 'consumables', label: '소모품 품목', placeholder: '예: PC_키보드' },
  { key: 'manufacturers', label: '제조사(제안 목록)', placeholder: '예: LG' },
]

/**
 * 코드(Master) 관리 페이지.
 * 자산구분/렌탈사/소모품/제조사 선택지를 관리자가 추가·수정·삭제하고 저장하면
 * 서버(시트 `9_코드마스터`)에 반영되어 모든 화면의 선택 항목에 공유됩니다.
 *
 * @returns 코드 관리 페이지
 */
export default function MasterPage() {
  const { codes, saveCodes, resetCodes } = useMasterCodes()
  const [draft, setDraft] = useState<MasterCodes>(() => structuredClone(codes))
  const [saving, setSaving] = useState(false)

  // 서버 pull/외부 변경 시 초안 재시드
  useEffect(() => setDraft(structuredClone(codes)), [codes])

  /** 특정 그룹의 목록을 갱신. */
  function setGroup(key: keyof MasterCodes, items: string[]) {
    setDraft((prev) => ({ ...prev, [key]: items }))
  }

  /** 저장(빈 항목 정리 + 중복 제거 후 서버 반영). */
  async function handleSave() {
    const cleaned: MasterCodes = {
      categories: dedupe(draft.categories),
      rentalCompanies: dedupe(draft.rentalCompanies),
      consumables: dedupe(draft.consumables),
      manufacturers: dedupe(draft.manufacturers),
    }
    setSaving(true)
    const result = await saveCodes(cleaned)
    setSaving(false)
    window.alert(result.ok ? '코드를 저장했습니다. (모든 기기 공유)' : `저장 실패: ${result.message ?? '서버 오류'}`)
  }

  /** 기본값 복원. */
  async function handleReset() {
    if (!window.confirm('코드를 기본값으로 되돌릴까요?')) return
    setSaving(true)
    const result = await resetCodes()
    setSaving(false)
    window.alert(result.ok ? '기본값으로 되돌렸습니다.' : `실패: ${result.message ?? '서버 오류'}`)
  }

  return (
    <div className="master-stack">
      <Card
        title="코드(Master) 관리"
        action={
          <div className="master-actions">
            <button type="button" className="master-btn" onClick={handleReset} disabled={saving}>
              <RotateCcw size={14} /> 기본값
            </button>
            <button type="button" className="master-btn primary" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        }
      >
        <p className="master-desc">
          자산 구분·렌탈사·소모품 품목·제조사 선택지를 관리합니다. 저장하면 등록/신청 폼의 선택 항목에 반영됩니다.
          <br />
          (자산 상태·수리 우선순위처럼 색상과 묶인 값은 안정성을 위해 코드에서 고정 관리합니다.)
          <br />※ 각 그룹 제목을 눌러 접고 펼 수 있습니다.
        </p>
      </Card>

      {/* 그룹별 접이식 카드 — 길이가 길어 섹션 단위로 접을 수 있게 함(상태 기억) */}
      {GROUPS.map((g) => (
        <Card key={g.key} title={g.label} collapsible storageKey={`master.${g.key}`}>
          <StringListEditor
            items={draft[g.key]}
            onChange={(items) => setGroup(g.key, items)}
            placeholder={g.placeholder}
          />
        </Card>
      ))}
    </div>
  )
}

/** 앞뒤 공백 제거 + 빈 항목 제외 + 중복 제거. */
function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)))
}
