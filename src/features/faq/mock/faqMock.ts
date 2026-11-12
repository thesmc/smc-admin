import type { FaqItem } from '../types'

/** FAQ 샘플 데이터. 실제 운영 시 `11_FAQ` 시트 값으로 대체됩니다. */
export const FAQ_MOCK: FaqItem[] = [
  {
    question: '노트북이 고장났어요. 수리 어떻게 신청하나요?',
    answer:
      '신청 페이지(/request)의 수리신청 탭에서 자산번호·증상·사진을 넣어 접수하면 됩니다. 접수 시 확인 메일이 발송됩니다.',
    keywords: '수리, 노트북, 고장, A/S',
  },
  {
    question: '새 모니터가 필요한데 어떻게 요청하나요?',
    answer: '신청 페이지(/request)의 자산신청 탭에서 품목과 사유를 적어 신청하면 총무팀이 검토 후 처리합니다.',
    keywords: '자산신청, 모니터, 비품, 요청',
  },
  {
    question: '키보드/마우스 같은 소모품은 어디서 받나요?',
    answer: '신청 페이지(/request)의 소모품신청 탭에서 품목과 수량을 신청하면 재고에서 지급하거나 구매 요청합니다.',
    keywords: '소모품, 키보드, 마우스, 지급',
  },
]
