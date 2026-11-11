import type { UserRow } from '../types'

/**
 * 사용자 목록 더미 데이터.
 * 추후 GAS(`?action=users`) 연동 시 useUsers 훅의 실데이터로 대체됩니다.
 */
export const USERS_MOCK: UserRow[] = [
  { id: '2201', name: '김개발', division: 'AI Labs', department: '개발팀', position: '사원', email: 'kim@thesmc.co.kr' },
  { id: '2105', name: '이기획', division: '미래전략본부', department: '기획팀', position: '대리', email: 'lee@thesmc.co.kr' },
  { id: '1904', name: '박영업', division: '광고사업 1본부', department: '영업팀', position: '과장', email: 'park@thesmc.co.kr' },
  { id: '1801', name: '이관리', division: '경영본부', department: 'IT관리팀', position: '차장', email: 'admin@thesmc.co.kr' },
  { id: '2007', name: '최마케팅', division: '브랜드그로스', department: '마케팅팀', position: '사원', email: 'choi@thesmc.co.kr' },
]
