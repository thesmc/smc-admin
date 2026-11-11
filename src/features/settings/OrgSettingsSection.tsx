import { useEffect, useState } from 'react'
import { Plus, Trash2, RotateCcw, Save } from 'lucide-react'
import { Card } from '@/components/ui'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import type { Division } from '@/config/orgDefaults'
import './OrgSettingsSection.css'

/**
 * 조직(부서/사용위치) 관리 섹션. (설정 화면)
 * 관리자가 본부·팀·사용위치를 추가/수정/삭제하고 '저장'하면 서버(시트)에 반영되어
 * 모든 기기/사용자의 폼 셀렉트에 공유됩니다.
 *
 * @returns 조직 관리 섹션
 */
export default function OrgSettingsSection() {
  const {
    divisions: srvDivisions,
    locations: srvLocations,
    setDivisions,
    setLocations,
    resetDivisionsToDefault,
    resetLocationsToDefault,
  } = useOrgSettings()
  // 편집 중 값은 로컬 초안으로 다루고, '저장' 시점에만 서버/캐시에 반영합니다.
  const [divisions, setDivDraft] = useState<Division[]>(() => structuredClone(srvDivisions))
  const [locations, setLocDraft] = useState<string[]>(() => [...srvLocations])
  const [saving, setSaving] = useState(false)

  // 서버 pull/외부 변경으로 최신값이 오면 초안을 다시 시드(마운트 직후 서버 동기화 반영)
  useEffect(() => setDivDraft(structuredClone(srvDivisions)), [srvDivisions])
  useEffect(() => setLocDraft([...srvLocations]), [srvLocations])

  /** 본부 이름 변경. */
  function setDivName(i: number, name: string) {
    setDivDraft((prev) => prev.map((d, idx) => (idx === i ? { ...d, name } : d)))
  }
  /** 본부 추가. */
  function addDivision() {
    setDivDraft((prev) => [...prev, { name: '새 본부', teams: [] }])
  }
  /** 본부 삭제. */
  function removeDivision(i: number) {
    setDivDraft((prev) => prev.filter((_, idx) => idx !== i))
  }
  /** 팀 이름 변경. */
  function setTeam(i: number, j: number, name: string) {
    setDivDraft((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, teams: d.teams.map((t, tj) => (tj === j ? name : t)) } : d)),
    )
  }
  /** 팀 추가. */
  function addTeam(i: number) {
    setDivDraft((prev) => prev.map((d, idx) => (idx === i ? { ...d, teams: [...d.teams, ''] } : d)))
  }
  /** 팀 삭제. */
  function removeTeam(i: number, j: number) {
    setDivDraft((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, teams: d.teams.filter((_, tj) => tj !== j) } : d)),
    )
  }

  /** 저장 결과를 사용자에게 알립니다. */
  function notify(result: { ok: boolean; message?: string }, okMsg: string) {
    window.alert(result.ok ? okMsg : `저장 실패: ${result.message ?? '서버 오류'}`)
  }

  /** 부서 구조 저장(빈 이름/팀 정리 후 서버 반영). */
  async function saveDivisions() {
    const cleaned = divisions
      .map((d) => ({ name: d.name.trim(), teams: d.teams.map((t) => t.trim()).filter(Boolean) }))
      .filter((d) => d.name !== '')
    setSaving(true)
    const result = await setDivisions(cleaned)
    setSaving(false)
    notify(result, '부서 구성을 저장했습니다. (모든 기기 공유)')
  }
  /** 부서 기본값 복원(서버 반영). */
  async function resetDiv() {
    if (!window.confirm('부서 구성을 기본값으로 되돌릴까요?')) return
    setSaving(true)
    const result = await resetDivisionsToDefault()
    setSaving(false)
    notify(result, '부서 구성을 기본값으로 되돌렸습니다.')
  }

  /** 사용위치 저장(서버 반영). */
  async function saveLocations() {
    setSaving(true)
    const result = await setLocations(locations.map((l) => l.trim()).filter(Boolean))
    setSaving(false)
    notify(result, '사용위치를 저장했습니다. (모든 기기 공유)')
  }
  /** 사용위치 기본값 복원(서버 반영). */
  async function resetLoc() {
    if (!window.confirm('사용위치를 기본값으로 되돌릴까요?')) return
    setSaving(true)
    const result = await resetLocationsToDefault()
    setSaving(false)
    notify(result, '사용위치를 기본값으로 되돌렸습니다.')
  }

  return (
    <>
      <Card
        title="부서(조직) 관리"
        collapsible
        storageKey="set.org.div"
        action={
          <div className="org-head-actions">
            <button type="button" className="org-btn" onClick={resetDiv} disabled={saving}>
              <RotateCcw size={14} /> 기본값
            </button>
            <button type="button" className="org-btn primary" onClick={saveDivisions} disabled={saving}>
              <Save size={14} /> {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        }
      >
        <p className="org-desc">본부와 하위 팀을 추가·수정·삭제합니다. 저장하면 부서 선택 항목에 반영됩니다.</p>

        <div className="org-div-list">
          {divisions.map((div, i) => (
            <div key={i} className="org-div">
              <div className="org-div-head">
                <input
                  className="org-div-name"
                  value={div.name}
                  onChange={(e) => setDivName(i, e.target.value)}
                  placeholder="본부명"
                />
                <button type="button" className="org-del" onClick={() => removeDivision(i)} aria-label="본부 삭제">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="org-team-list">
                {div.teams.map((team, j) => (
                  <div key={j} className="org-team">
                    <input value={team} onChange={(e) => setTeam(i, j, e.target.value)} placeholder="팀명" />
                    <button type="button" className="org-del" onClick={() => removeTeam(i, j)} aria-label="팀 삭제">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" className="org-add-team" onClick={() => addTeam(i)}>
                  <Plus size={13} /> 팀 추가
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="org-add-div" onClick={addDivision}>
          <Plus size={15} /> 본부 추가
        </button>
      </Card>

      <Card
        title="사용위치 관리"
        collapsible
        storageKey="set.org.loc"
        action={
          <div className="org-head-actions">
            <button type="button" className="org-btn" onClick={resetLoc} disabled={saving}>
              <RotateCcw size={14} /> 기본값
            </button>
            <button type="button" className="org-btn primary" onClick={saveLocations} disabled={saving}>
              <Save size={14} /> {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        }
      >
        <p className="org-desc">사옥·층 등 자산 사용위치를 관리합니다. 저장하면 위치 선택 항목에 반영됩니다.</p>
        <div className="org-loc-list">
          {locations.map((loc, i) => (
            <div key={i} className="org-loc">
              <input
                value={loc}
                onChange={(e) => setLocDraft((prev) => prev.map((l, idx) => (idx === i ? e.target.value : l)))}
                placeholder="예: 1사옥 3층"
              />
              <button
                type="button"
                className="org-del"
                onClick={() => setLocDraft((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="위치 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="org-add-div" onClick={() => setLocDraft((prev) => [...prev, ''])}>
          <Plus size={15} /> 위치 추가
        </button>
      </Card>
    </>
  )
}
