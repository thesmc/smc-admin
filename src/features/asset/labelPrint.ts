import QRCode from 'qrcode'
import type { AssetRow } from './types'

/** HTML 특수문자를 이스케이프합니다. (라벨 텍스트 안전 삽입) */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 회사 로고(public/logo.png)를 data URL로 불러옵니다.
 * 새 인쇄 창은 앱 base 경로를 모르므로, 이미지를 data URL로 임베드합니다.
 *
 * @returns 로고 data URL, 파일이 없으면 null
 */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}logo.png`)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * 자산번호를 QR 코드 이미지(data URL)로 생성합니다.
 * 300dpi 열전사 프린터(도시바 B-FV4)에서도 또렷하도록 고해상도(400px)로 뽑고,
 * 스캔 신뢰성을 위해 여백(quiet zone, 2모듈)을 둡니다.
 *
 * @param value - QR로 인코딩할 값(자산번호)
 * @returns PNG data URL
 */
function makeQrDataUrl(value: string): Promise<string> {
  // margin(모듈 단위 여백)이 너무 작으면 스캔 실패 → 2 유지. width는 인쇄 선명도용 고해상도.
  return QRCode.toDataURL(value, { margin: 2, width: 400, errorCorrectionLevel: 'M' })
}

/**
 * 라벨 공통 스타일. 단건·일괄 인쇄가 동일 레이아웃을 쓰도록 한 곳에서 정의.
 * 대상 프린터: 도시바 B-FV4 (300dpi) · 라벨지 50×30mm.
 */
const LABEL_STYLE = `
  * { box-sizing: border-box; font-family: -apple-system, 'Malgun Gothic', sans-serif; }
  /* 프린터 드라이버가 임의 여백을 넣지 못하도록 용지=라벨 크기로 고정 */
  html, body { margin: 0; padding: 0; width: 50mm; }
  @page { size: 50mm 30mm; margin: 0; }
  .label { width: 50mm; height: 30mm; padding: 1.5mm; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 0.8mm; overflow: hidden;
    /* 열전사는 1비트 출력 — 검정이 흐려지지 않게 색 보존 강제 */
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .logo { font-size: 10pt; letter-spacing: 0.5px; }
  .logo b { font-weight: 800; }
  .logo-img { height: 4.5mm; width: auto; object-fit: contain; }
  .qr { width: 18mm; height: 18mm; }
  .num { font-size: 9pt; font-weight: 800; letter-spacing: 0.3px; }
  @media print {
    /* 라벨마다 한 페이지(장)씩 인쇄. 마지막은 빈 페이지 방지. */
    .label { page-break-after: always; }
    .label:last-of-type { page-break-after: auto; }
    .actions, .print-hint { display: none; }
  }
  @media screen {
    body { background: #f1f5f9; padding: 24px; text-align: center; }
    .label { background: #fff; border: 1px solid #ddd; margin: 0 auto 12px; }
    .print-hint { max-width: 320px; margin: 0 auto 12px; font-size: 12px; color: #475569;
      background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px 12px; line-height: 1.5; }
    .actions { margin-top: 8px; }
    .actions button { padding: 8px 18px; font-size: 14px; font-weight: 700;
      background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
  }
`

/**
 * 자산 라벨(로고 + QR + 자산번호)을 새 창에서 생성해 인쇄합니다.
 * 여러 건이면 라벨마다 한 페이지씩 이어서 인쇄합니다. (일괄 바코드 출력)
 * 팝업 차단을 피하려 클릭 시점에 창을 먼저 열고, QR 생성 후 내용을 채웁니다.
 *
 * @param assets - 인쇄할 자산 목록(1건 이상)
 */
export async function printAssetLabels(assets: AssetRow[]): Promise<void> {
  const printable = assets.filter((a) => a.assetNumber || a.name)
  if (printable.length === 0) {
    window.alert('인쇄할 자산이 없습니다.')
    return
  }

  const win = window.open('', '_blank', 'width=460,height=620')
  if (!win) {
    window.alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.')
    return
  }
  win.document.write('<p style="font-family:sans-serif;padding:24px">라벨 생성 중…</p>')

  try {
    const logo = await loadLogoDataUrl()
    // 로고 파일(public/logo.png)이 있으면 이미지, 없으면 텍스트 자리표시
    const logoHtml = logo
      ? `<img class="logo-img" src="${logo}" alt="the SMC" />`
      : `<div class="logo">the <b>SMC</b></div>`

    // 자산마다 QR을 만들어 라벨 조각을 생성(병렬)
    const labels = await Promise.all(
      printable.map(async (asset) => {
        const qr = await makeQrDataUrl(asset.assetNumber || asset.name)
        return `<div class="label">${logoHtml}
    <img class="qr" src="${qr}" alt="QR" />
    <div class="num">${escapeHtml(asset.assetNumber) || '-'}</div>
  </div>`
      }),
    )

    const title = printable.length === 1 ? `자산 라벨 ${escapeHtml(printable[0].assetNumber)}` : `자산 라벨 ${printable.length}건`
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<title>${title}</title>
<style>${LABEL_STYLE}</style></head><body>
  <div class="print-hint">도시바 B-FV4 인쇄 설정: <b>용지 50×30mm</b> · <b>배율 100%(실제 크기)</b> · 여백 없음으로 지정하세요. 라벨마다 1장씩 인쇄됩니다.</div>
  ${labels.join('\n  ')}
  <div class="actions"><button onclick="window.print()">인쇄 (${printable.length}건)</button></div>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 300) }</script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  } catch (error) {
    console.error('[라벨 생성 실패]', error)
    win.document.body.innerHTML =
      '<p style="font-family:sans-serif;padding:24px;color:#b91c1c">QR 생성에 실패했습니다. 자산번호를 확인해주세요.</p>'
  }
}

/**
 * 단일 자산 라벨을 인쇄합니다. (기존 호출부 호환 — 내부적으로 일괄 인쇄 재사용)
 *
 * @param asset - 인쇄할 자산
 */
export function printAssetLabel(asset: AssetRow): Promise<void> {
  return printAssetLabels([asset])
}
