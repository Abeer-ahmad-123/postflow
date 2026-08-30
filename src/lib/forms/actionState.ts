export type ActionState = {
  href?: string
  id?: string
  message?: string
  ok: boolean
}

export const initialActionState: ActionState = {
  ok: false,
}
