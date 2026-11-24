import type { DashboardData } from '../types'

/**
 * 대시보드 더미 데이터.
 * GAS 실데이터가 없거나(mock 모드) 특정 섹션이 비었을 때 화면을 채웁니다.
 * (useDashboardData 훅이 실데이터에 이 값을 폴백으로 병합)
 */
export const DASHBOARD_MOCK: DashboardData = {
  stats: {
    totalAssets: 1248,
    inUseAssets: 1002,
    repairingAssets: 28,
    disposalPlannedAssets: 45,
    stockAssets: 173,
    lowStockCount: 16,
  },
  // 자산 구분별 집계 (도넛 차트). 합계 1,248대.
  categories: [
    { category: '노트북', count: 563 },
    { category: '모니터', count: 320 },
    { category: '데스크탑', count: 198 },
    { category: '프린터', count: 95 },
    { category: '기타', count: 72 },
  ],
  acquisition: { purchase: 812, rental: 436 },
  rentalByCompany: [
    { company: '롯데렌탈', count: 268, cost: 13400000 },
    { company: 'AJ네트웍스', count: 168, cost: 6720000 },
  ],
  rentalMonthlyTotal: 20120000,
  recentChanges: [
    { at: '2026-08-31', kind: '자산배정', actor: '이관리', target: 'AST-2024-1248', field: '사용자', before: '홍길동', after: '김춘향', note: '' },
    { at: '2026-08-30', kind: '자산배정', actor: '이관리', target: 'AST-2021-0456', field: '사용자', before: '정운영', after: '(반납)', note: '' },
    { at: '2026-08-30', kind: '자산변경', actor: '이관리', target: 'AST-2024-1246', field: '상태', before: '사용중', after: '수리중', note: '' },
    { at: '2026-08-29', kind: '렌탈반납', actor: '이관리', target: 'AST-2020-0087', field: '비용지출', before: '진행중', after: '종료', note: '월 41000원 / 롯데렌탈 렌탈 종료' },
  ],
  requests: [
    { kind: '자산 신청', title: '노트북 지급 신청 (개발팀 김개발)', date: '2024-05-20', status: '승인 대기' },
    { kind: '소모품 신청', title: '토너 카트리지 신청 (총무팀 이총무)', date: '2024-05-20', status: '승인 대기' },
    { kind: '유지보수 신청', title: '노트북 화면 불량 (영업팀 박영업)', date: '2024-05-19', status: '처리 중' },
    { kind: '구매 신청', title: '27인치 모니터 구매 (개발팀 김개발)', date: '2024-05-19', status: '승인 대기' },
    { kind: '자산 반납', title: '노트북 반납 신청 (퇴사자 정퇴사)', date: '2024-05-18', status: '승인 완료' },
  ],
  lowStock: [
    { name: '토너 카트리지 (검정)', currentStock: 3, threshold: 77, unit: '개' },
    { name: 'A4 용지', currentStock: 1, threshold: 5, unit: '박스' },
    { name: '볼펜 (검정)', currentStock: 12, threshold: 38, unit: '개' },
    { name: '화이트보드 마커', currentStock: 4, threshold: 16, unit: '개' },
  ],
  recentAssets: [
    { assetNumber: 'AST-2024-1248', name: 'MacBook Pro 16', category: '노트북', acquiredDate: '2024-05-20', user: '김개발 (개발팀)', status: '사용중' },
    { assetNumber: 'AST-2024-1247', name: 'LG 27인치 모니터', category: '모니터', acquiredDate: '2024-05-20', user: '이기획 (기획팀)', status: '사용중' },
    { assetNumber: 'AST-2024-1246', name: '삼성 노트북', category: '노트북', acquiredDate: '2024-05-19', user: '박영업 (영업팀)', status: '사용중' },
    { assetNumber: 'AST-2024-1245', name: 'HP 프린터', category: '프린터', acquiredDate: '2024-05-18', user: '총무팀', status: '사용중' },
    { assetNumber: 'AST-2024-1244', name: 'iPhone 15 Pro', category: '기타', acquiredDate: '2024-05-17', user: '최마케팅 (마케팅팀)', status: '사용중' },
  ],
  disposals: [
    { assetNumber: 'AST-2021-0456', name: 'Dell 노트북', acquiredDate: '2021-06-15', usefulLifeYears: 3, disposalDate: '2024-06-15', withinDays: 30 },
    { assetNumber: 'AST-2021-0455', name: 'LG 24인치 모니터', acquiredDate: '2021-07-01', usefulLifeYears: 3, disposalDate: '2024-07-01', withinDays: 60 },
    { assetNumber: 'AST-2021-0342', name: 'HP 데스크탑', acquiredDate: '2021-08-20', usefulLifeYears: 3, disposalDate: '2024-08-20', withinDays: 90 },
    { assetNumber: 'AST-2021-0221', name: '삼성 프린터', acquiredDate: '2021-09-10', usefulLifeYears: 3, disposalDate: '2024-09-10', withinDays: 120 },
  ],
}
