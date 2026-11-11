import { useMemo, useState } from 'react'
import { Users, Building2, Plus } from 'lucide-react'
import { StatCard, Card } from '@/components/ui'
import LoadingState from '@/components/feedback/LoadingState'
import MockNotice from '@/components/feedback/MockNotice'
import EmptyState from '@/components/feedback/EmptyState'
import { useUsers } from './useUsers'
import UserFormModal from './UserFormModal'
import type { UserRow } from './types'
import './UsersListPage.css'

/**
 * 사용자관리 모듈 메인 페이지.
 * 직원 목록(요약 + 표)을 보여주고, 등록/수정은 모달로 처리합니다.
 *
 * @returns 사용자관리 페이지
 */
export default function UsersListPage() {
  const { users, loading, usingMock, upsertUser } = useUsers()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)

  const departmentCount = useMemo(
    () => new Set(users.map((u) => u.department).filter(Boolean)).size,
    [users],
  )

  /** 등록 모달 열기(신규). */
  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  /** 수정 모달 열기(기존 행). */
  function openEdit(user: UserRow) {
    setEditing(user)
    setFormOpen(true)
  }

  return (
    <>
      {loading && <LoadingState message="사용자 목록 불러오는 중…" />}
      {!loading && usingMock && (
        <MockNotice message="샘플(mock) 데이터 표시 중 — 구글시트 연동 후 실제 사용자가 표시됩니다." />
      )}

      <div className="users-stat-row">
        <StatCard label="전체 사용자" value={users.length} unit="명" tone="blue" icon={<Users size={22} />} />
        <StatCard label="부서 수" value={departmentCount} unit="개" tone="green" icon={<Building2 size={22} />} />
      </div>

      <Card
        title="사용자 목록"
        action={
          <button type="button" className="users-add-btn" onClick={openNew}>
            <Plus size={16} /> 사용자 등록
          </button>
        }
      >
        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>본부</th>
                <th>부서</th>
                <th>직급</th>
                <th>이메일</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={Users} title="등록된 사용자가 없습니다." hint="우측 상단 ‘사용자 등록’으로 추가하세요." />
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="users-row" onClick={() => openEdit(u)}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.division}</td>
                  <td>{u.department}</td>
                  <td>{u.position}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {formOpen && (
        <UserFormModal
          key={editing?.id ?? 'new'}
          user={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(user) => upsertUser(user)}
        />
      )}
    </>
  )
}
