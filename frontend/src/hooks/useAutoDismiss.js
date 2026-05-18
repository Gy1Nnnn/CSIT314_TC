import { useEffect } from 'react'

/** Clear a transient alert/message after `ms` milliseconds. */
export function useAutoDismiss(message, setMessage, ms = 2000) {
  useEffect(() => {
    if (!message) return undefined
    const id = setTimeout(() => setMessage(null), ms)
    return () => clearTimeout(id)
  }, [message, setMessage, ms])
}
