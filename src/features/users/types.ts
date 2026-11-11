/** 사용자(직원) 1건. 구글시트 `5_사용자목록` 한 행에 대응. */
export interface UserRow {
  /** 사번(고유 식별자). */
  id: string
  /** 이름. */
  name: string
  /** 소속 본부. */
  division: string
  /** 소속 부서. */
  department: string
  /** 직급. */
  position: string
  /** 이메일. */
  email: string
}

/** 사용자 등록/수정 폼 값. (사번은 등록 시에만 입력) */
export type UserFormValues = UserRow
