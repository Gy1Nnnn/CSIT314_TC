export default function Logo({ size = 'md', variant }) {
  const isSm = size === 'sm'
  const className = `app-logo app-logo--${isSm ? 'sm' : 'md'}${variant === 'wordmark' ? ' app-logo--wordmark' : ''}`
  return (
    <span className={className} aria-label="Courage">
      <span className="app-logo-mark">C</span>
      {variant === 'wordmark' ? <span className="app-logo-text">ourage</span> : null}
    </span>
  )
}
