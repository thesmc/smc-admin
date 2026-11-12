import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui'
import LoadingState from '@/components/feedback/LoadingState'
import MockNotice from '@/components/feedback/MockNotice'
import { useFaq } from './useFaq'
import { saveFaq } from './api'
import type { FaqItem } from './types'
import './FaqPage.css'

/** 빈 FAQ 행. */
function emptyItem(): FaqItem {
  return { question: '', answer: '', keywords: '' }
}

/**
 * FAQ/챗봇 관리 페이지. (총무팀)
 * 슬랙 `/문의` 챗봇이 1차 답변의 근거로 쓰는 예상질문/답변을 편집·저장합니다.
 * 저장하면 서버(시트 `11_FAQ`)에 반영되어 챗봇이 최신 FAQ로 응답합니다.
 *
 * @returns FAQ 관리 페이지
 */
export default function FaqPage() {
  const { faq, loading, usingMock } = useFaq()
  const [draft, setDraft] = useState<FaqItem[]>(faq)
  const [saving, setSaving] = useState(false)

  // 서버 조회 결과가 오면 편집 초안을 재시드
  useEffect(() => setDraft(faq), [faq])

  /** 특정 행의 한 필드를 갱신. */
  function setField(index: number, key: keyof FaqItem, value: string) {
    setDraft((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  /** 행 추가/삭제. */
  function addRow() {
    setDraft((prev) => [...prev, emptyItem()])
  }
  function removeRow(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index))
  }

  /** 저장(질문 또는 답변이 있는 행만 정리해 서버 반영). */
  async function handleSave() {
    const cleaned = draft
      .map((it) => ({
        question: it.question.trim(),
        answer: it.answer.trim(),
        keywords: it.keywords.trim(),
      }))
      .filter((it) => it.question || it.answer)
    setSaving(true)
    const result = await saveFaq(cleaned)
    setSaving(false)
    if (result.ok) {
      setDraft(cleaned.length ? cleaned : [emptyItem()])
      window.alert('FAQ를 저장했습니다. 슬랙 챗봇이 이 내용으로 응답합니다.')
    } else {
      window.alert(`저장 실패: ${result.message ?? '서버 오류'}`)
    }
  }

  return (
    <Card
      title="FAQ / 챗봇 관리"
      action={
        <button type="button" className="faq-save" onClick={handleSave} disabled={saving || loading}>
          <Save size={14} /> {saving ? '저장 중…' : '저장'}
        </button>
      }
    >
      <p className="faq-desc">
        <MessageSquare size={14} /> 슬랙에서 <b>/문의</b> 로 질문하면, 아래 FAQ를 근거로 챗봇(Gemini)이 1차 답변합니다.
        FAQ로 확실히 답할 수 없는 질문은 “총무팀에 문의” 안내로 넘어갑니다. 질문·답변을 자유롭게 추가·수정하세요.
      </p>

      {loading && <LoadingState message="FAQ 불러오는 중…" />}
      {!loading && usingMock && (
        <MockNotice message="샘플(mock) FAQ 표시 중 — 저장하면 서버(시트)에 반영되어 챗봇이 사용합니다." />
      )}

      <div className="faq-list">
        {draft.map((item, i) => (
          <div key={i} className="faq-item">
            <div className="faq-item-head">
              <span className="faq-item-no">Q{i + 1}</span>
              <button
                type="button"
                className="faq-item-del"
                aria-label="항목 삭제"
                onClick={() => removeRow(i)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <input
              className="faq-input"
              value={item.question}
              onChange={(e) => setField(i, 'question', e.target.value)}
              placeholder="예상 질문 (예: 노트북 수리 어떻게 신청해요?)"
            />
            <textarea
              className="faq-textarea"
              value={item.answer}
              onChange={(e) => setField(i, 'answer', e.target.value)}
              rows={2}
              placeholder="답변 (챗봇이 이 내용을 바탕으로 응답)"
            />
            <input
              className="faq-input faq-keywords"
              value={item.keywords}
              onChange={(e) => setField(i, 'keywords', e.target.value)}
              placeholder="키워드(선택, 쉼표 구분) — 예: 수리, 노트북, A/S"
            />
          </div>
        ))}
      </div>

      <button type="button" className="faq-add" onClick={addRow}>
        <Plus size={15} /> 질문 추가
      </button>
    </Card>
  )
}
