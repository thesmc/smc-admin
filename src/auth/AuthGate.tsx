import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRoleAuth } from './useRoleAuth'
import { AuthContext } from './AuthContext'
import './AuthGate.css'

/**
 * 역할별 비밀번호 로그인 게이트.
 * 미로그인이면 비밀번호 화면을, 로그인되면 역할을 컨텍스트로 제공하며 앱을 렌더링합니다.
 * (입력한 비밀번호로 총무팀/직원/외부업체 역할이 자동 판별됩니다.)
 *
 * @param props.children - 인증 후 렌더링할 앱
 * @returns 로그인 화면 또는 앱
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { role, error, guestEnabled, signIn, enterGuest, signOut } = useRoleAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // React는 muted 속성을 DOM 프로퍼티로 항상 반영하지 않아 자동재생이 막힐 수 있습니다.
  // ref로 muted를 직접 지정하고 play()를 호출해 배경 영상 자동재생을 보장합니다.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    // 자동재생 거부(사용자 상호작용 전 등)는 조용히 무시 — 폴백 배경이 보입니다.
    void video.play().catch(() => {})
  }, [role])

  /** 로그인 폼 제출. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    await signIn(password)
    setBusy(false)
    setPassword('')
  }

  if (!role) {
    return (
      <div className="auth-screen">
        {/* 좌측: 로그인 */}
        <div className="auth-left">
          <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-brand">
              The SMC <span>Platform</span>
            </div>
            <p className="auth-desc">비밀번호를 입력하세요.</p>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
            />
            <button type="submit" className="auth-submit" disabled={busy || !password}>
              {busy ? '확인 중…' : '로그인'}
            </button>
            {error && <p className="auth-error">{error}</p>}

            {/* '비밀번호 없이 입장' 토글(설정·서버 공유)이 켜진 동안만 노출 → 총무팀으로 바로 입장 */}
            {guestEnabled && (
              <button type="button" className="auth-guest" onClick={enterGuest} disabled={busy}>
                비밀번호 없이 입장 (총무팀)
              </button>
            )}
          </form>
        </div>

        {/* 우측: 배경 영상 (public/videos/login_bg.mp4). 파일이 없으면 그라데이션 폴백 */}
        <div className="auth-right">
          <video
            ref={videoRef}
            className="auth-video"
            autoPlay
            muted
            loop
            playsInline
            // poster: 영상 버퍼링 전 첫 프레임 이미지를 즉시 표시 → 그라데이션 깜빡임 제거
            poster={`${import.meta.env.BASE_URL}videos/login_bg_poster.jpg`}
            // 파일이 아직 없거나 로드 실패 시 영상 요소를 숨겨 그라데이션 배경만 노출
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          >
            <source src={`${import.meta.env.BASE_URL}videos/login_bg.mp4`} type="video/mp4" />
          </video>
          <div className="auth-video-overlay" />
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={{ role, signOut }}>{children}</AuthContext.Provider>
}
