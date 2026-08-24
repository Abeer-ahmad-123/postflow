'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ActionTimeline } from '@/components/posts/action-timeline'
import type { PostAction } from '@/payload-types'

const HISTORY_REFRESH_EVENT = 'postflow:action-history-refresh'
const POLL_INTERVAL_MS = 3000

type ActionHistoryResponse = {
  actions?: PostAction[]
  message?: string
  ok?: boolean
}

export function notifyActionHistoryRefresh(postId: string) {
  window.dispatchEvent(new CustomEvent(HISTORY_REFRESH_EVENT, { detail: { postId } }))
}

export function RealtimeActionHistory({
  initialActions,
  postId,
}: {
  initialActions: PostAction[]
  postId: string
}) {
  const mounted = useRef(false)
  const [actions, setActions] = useState(initialActions)
  const [error, setError] = useState('')

  const refreshActions = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/actions`, {
        cache: 'no-store',
      })
      const result = (await response.json().catch(() => null)) as ActionHistoryResponse | null

      if (!response.ok || !result?.ok || !Array.isArray(result.actions)) {
        throw new Error(result?.message || 'Unable to refresh action history.')
      }

      if (mounted.current) {
        setActions(result.actions)
        setError('')
      }
    } catch (caughtError) {
      if (mounted.current) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to refresh action history.')
      }
    }
  }, [postId])

  useEffect(() => {
    mounted.current = true

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshActions()
      }
    }, POLL_INTERVAL_MS)

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshActions()
      }
    }

    const refreshFromEvent = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined

      if (!detail?.postId || detail.postId === postId) {
        void refreshActions()
      }
    }

    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener(HISTORY_REFRESH_EVENT, refreshFromEvent)

    return () => {
      mounted.current = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener(HISTORY_REFRESH_EVENT, refreshFromEvent)
    }
  }, [postId, refreshActions])

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
      <ActionTimeline actions={actions} />
    </div>
  )
}
