import { lazy } from 'react'
import { MessageSquare } from 'lucide-react'
import type { ModuleDef } from '@/app/types'

/** FAQ/챗봇 관리 모듈 정의. (슬랙 `/문의` 챗봇의 예상질문/답변 편집) */
export const faqModule: ModuleDef = {
  id: 'faq',
  title: 'FAQ/챗봇',
  path: 'faq',
  icon: MessageSquare,
  element: lazy(() => import('./FaqPage')),
  order: 10,
}
