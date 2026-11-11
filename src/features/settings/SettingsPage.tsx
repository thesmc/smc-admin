import { RotateCcw, Lock } from 'lucide-react'
import { Card } from '@/components/ui'
import { MODULES } from '@/app/registry'
import { LOCKED_MODULE_IDS, isModuleVisible } from '@/app/moduleVisibility'
import { useModuleVisibility } from '@/hooks/useModuleVisibility'
import OrgSettingsSection from './OrgSettingsSection'
import AuthSettingsSection from './AuthSettingsSection'
import GuestAccessSection from './GuestAccessSection'
import './SettingsPage.css'

/**
 * 설정 모듈 페이지.
 * 사이드바에 표시할 메뉴(모듈)를 사용자가 켜고 끌 수 있습니다. (브라우저 로컬 저장)
 * 대시보드·설정은 필수라 항상 표시(잠금)됩니다.
 *
 * @returns 설정 페이지
 */
export default function SettingsPage() {
  const { overrides, setVisible, reset } = useModuleVisibility()

  return (
    <div className="settings-stack">
    <Card
      title="사이드바 메뉴 표시 설정"
      action={
        <button type="button" className="set-reset" onClick={reset}>
          <RotateCcw size={14} /> 기본값 복원
        </button>
      }
    >
      <p className="set-desc">
        사이드바에 표시할 메뉴를 켜고 끌 수 있습니다. 숨긴 메뉴도 주소로는 접근 가능하며,
        설정은 이 브라우저에만 저장됩니다.
      </p>

      <ul className="set-list">
        {MODULES.map((module) => {
          const Icon = module.icon
          const locked = LOCKED_MODULE_IDS.includes(module.id)
          const visible = isModuleVisible(module, overrides)
          return (
            <li key={module.id} className="set-item">
              <span className="set-item-label">
                <Icon size={18} />
                {module.title}
                {locked && (
                  <span className="set-lock">
                    <Lock size={12} /> 필수
                  </span>
                )}
              </span>

              <label className="set-switch" aria-label={`${module.title} 표시`}>
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={locked}
                  onChange={(e) => setVisible(module.id, e.target.checked)}
                />
                <span className="set-slider" />
              </label>
            </li>
          )
        })}
      </ul>
    </Card>

      <OrgSettingsSection />
      <AuthSettingsSection />
      <GuestAccessSection />
    </div>
  )
}
