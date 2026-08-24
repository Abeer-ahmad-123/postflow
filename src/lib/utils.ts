import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function relationshipID(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id
    return typeof id === 'number' || typeof id === 'string' ? id : undefined
  }

  return undefined
}

export function userName(value: unknown) {
  if (value && typeof value === 'object') {
    const user = value as { email?: string | null; name?: string | null }
    return user.name || user.email || 'Unknown user'
  }

  return 'Unknown user'
}

export function formatDateTime(value?: null | string) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}
