import { useEffect, useState } from 'react'
import './ConfirmModal.css'

export default function ConfirmModal({
  open,
  variant = 'primary',
  title,
  message,
  confirmLabel = 'Confirm',
  withReason = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  if (!open) return null

  const confirmClass =
    variant === 'danger' ? 'btn danger' : 'btn primary'

  return (
    <div
      className="confirm-modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel?.()
      }}
    >
      <div className="confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="confirm-modal-title">
          {title}
        </h2>
        {message ? <p className="confirm-modal-msg">{message}</p> : null}
        {withReason ? (
          <div className="confirm-modal-field">
            <label className="field-label" htmlFor="confirm-reason">
              Reason (optional)
            </label>
            <textarea
              id="confirm-reason"
              className="input confirm-modal-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </div>
        ) : null}
        <div className="confirm-modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={confirmClass} onClick={() => onConfirm?.()} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
