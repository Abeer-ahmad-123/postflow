import type { Access } from 'payload'

export const authenticated: Access = ({ req }) => Boolean(req.user)

export const updateSelf: Access = ({ id, req }) => Boolean(req.user && String(req.user.id) === String(id))

export const deny: Access = () => false
