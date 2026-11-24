import { useState } from 'react'
import { QrCode, Keyboard } from 'lucide-react'
import { Badge, QrScannerModal } from '@/components/ui'
import './AssetPicker.css'

/** {@link AssetPicker} 컴포넌트 props. */
interface AssetPickerProps {
  /** 현재 선택된 자산번호. */
  assetNumber: string
  /** 현재 선택된 자산명. */
  assetName: string
  /** 자산 선택 콜백 (번호, 이름을 함께 전달). */
  onSelect: (assetNumber: string, assetName: string) => void
}

/**
 * 데모용 자산 조회 표. 실제로는 구글시트에서 자산번호로 조회합니다(5단계).
 * 지금은 직접 입력한 번호를 이 표에서 찾아 이름을 채웁니다.
 */
const MOCK_ASSETS: Record<string, string> = {
  'A-2034': '노트북 (LG gram 16)',
  'M-1021': '모니터 (LG 27UL)',
  'P-3005': '프린터 (HP LaserJet)',
}

/**
 * 자산 연결 위젯. (이미지 ③ '자산 정보')
 * QR 스캔 / 직접 입력 탭을 제공하고, 선택된 자산을 카드로 보여줍니다.
 *
 * @param props - {@link AssetPickerProps}
 * @returns 자산 선택 엘리먼트
 */
export default function AssetPicker({ assetNumber, assetName, onSelect }: AssetPickerProps) {
  const [mode, setMode] = useState<'qr' | 'manual'>('manual')
  const [scanOpen, setScanOpen] = useState(false)

  /**
   * 직접 입력한 자산번호로 자산명을 조회해 선택 상태를 갱신합니다.
   * @param value - 입력된 자산번호
   */
  function handleManualInput(value: string) {
    const upper = value.toUpperCase()
    onSelect(upper, MOCK_ASSETS[upper] ?? '')
  }

  /**
   * QR/바코드 스캔 결과로 자산번호를 채웁니다. (자산명은 라벨에 없으므로 조회표 폴백)
   * @param text - 디코드된 문자열(자산번호)
   */
  function handleScanned(text: string) {
    setScanOpen(false)
    const upper = text.trim().toUpperCase()
    onSelect(upper, MOCK_ASSETS[upper] ?? '')
  }

  return (
    <div className="asset-picker">
      <div className="picker-tabs">
        <button
          type="button"
          className={mode === 'qr' ? 'picker-tab active' : 'picker-tab'}
          onClick={() => setMode('qr')}
        >
          <QrCode size={16} /> QR코드 스캔
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'picker-tab active' : 'picker-tab'}
          onClick={() => setMode('manual')}
        >
          <Keyboard size={16} /> 직접 입력
        </button>
      </div>

      {mode === 'qr' ? (
        <button type="button" className="picker-scan" onClick={() => setScanOpen(true)}>
          <QrCode size={16} /> 카메라로 스캔하기
        </button>
      ) : (
        <input
          className="form-input"
          placeholder="자산번호 입력 (예: A-2034)"
          value={assetNumber}
          onChange={(event) => handleManualInput(event.target.value)}
        />
      )}

      {assetNumber && (
        <div className="picker-selected">
          <div>
            <strong>{assetNumber}</strong>
            <span>{assetName || '미등록 자산'}</span>
          </div>
          <Badge variant="success">사용 중</Badge>
        </div>
      )}

      {scanOpen && <QrScannerModal onClose={() => setScanOpen(false)} onDetected={handleScanned} />}
    </div>
  )
}
