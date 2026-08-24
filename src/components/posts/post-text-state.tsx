'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type PostTextState = {
  currentPostText?: null | string
  savedPostText?: null | string
  setCurrentPostText: (postText: string) => void
  setSavedPostText: (postText: string) => void
}

const PostTextContext = createContext<PostTextState | null>(null)

export function PostTextProvider({
  children,
  initialPostText,
}: {
  children: ReactNode
  initialPostText?: null | string
}) {
  const [currentPostText, setCurrentPostText] = useState(initialPostText)
  const [savedPostText, setSavedPostText] = useState(initialPostText)
  const value = useMemo(
    () => ({
      currentPostText,
      savedPostText,
      setCurrentPostText,
      setSavedPostText,
    }),
    [currentPostText, savedPostText],
  )

  return <PostTextContext.Provider value={value}>{children}</PostTextContext.Provider>
}

export function usePostTextState(fallbackPostText?: null | string) {
  const state = useContext(PostTextContext)

  return {
    currentPostText: state?.currentPostText ?? fallbackPostText,
    savedPostText: state?.savedPostText ?? fallbackPostText,
    setCurrentPostText: state?.setCurrentPostText,
    setSavedPostText: state?.setSavedPostText,
  }
}
