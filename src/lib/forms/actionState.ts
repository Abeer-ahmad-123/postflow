export type ActionState = {
  id?: string
  message?: string
  ok: boolean
}

export const initialActionState: ActionState = {
  ok: false,
}
