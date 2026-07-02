import { useState, useEffect } from 'react'

const STORAGE_KEY = 'byoos_progress'

export function useProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const markComplete = (moduleId) => {
    setProgress(prev => ({ ...prev, [moduleId]: { completed: true, completedAt: Date.now() } }))
  }

  const isComplete = (moduleId) => !!progress[moduleId]?.completed

  const getCompletedCount = () => Object.values(progress).filter(p => p?.completed).length

  return { progress, markComplete, isComplete, getCompletedCount }
}
