/** FAQ(예상질문/답변) 1건. 구글시트 `11_FAQ` 한 행에 대응. 슬랙 챗봇 1차 대응 근거. */
export interface FaqItem {
  /** 예상 질문. */
  question: string
  /** 답변. */
  answer: string
  /** 매칭 키워드(쉼표 구분, 선택). */
  keywords: string
}
