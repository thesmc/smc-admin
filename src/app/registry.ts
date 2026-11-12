import type { ModuleDef } from './types'
import { dashboardModule } from '@/features/dashboard'
import { purchaseModule } from '@/features/purchase'
import { assetModule } from '@/features/asset'
import { consumableModule } from '@/features/consumable'
import { repairModule } from '@/features/repair'
import { requestsModule } from '@/features/requests'
import { masterModule } from '@/features/master'
import { usersModule } from '@/features/users'
import { settingsModule } from '@/features/settings'
import { faqModule } from '@/features/faq'

/**
 * 플랫폼에 등록된 전체 모듈 목록.
 * 사이드바와 라우터가 이 배열 하나만 참조하므로,
 * 새 모듈은 여기에 한 줄 추가하면 메뉴·라우트에 자동 반영됩니다.
 * (4단계에서 라우터/사이드바가 이 배열을 소비하도록 연결)
 */
export const MODULES: ModuleDef[] = [
  dashboardModule,
  purchaseModule,
  assetModule,
  consumableModule,
  repairModule,
  requestsModule,
  masterModule,
  usersModule,
  settingsModule,
  faqModule,
].sort((a, b) => a.order - b.order)
