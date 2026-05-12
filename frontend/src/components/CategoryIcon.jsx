import './CategoryIcon.css'

const PALETTE = ['#0d6efd', '#198754', '#fd7e14', '#6f42c1', '#d63384', '#20c997']

export default function CategoryIcon({ name, index = 0 }) {
  const color = PALETTE[Math.abs(index) % PALETTE.length]
  const initial = (name && String(name).trim()[0]) || '?'
  return (
    <span
      className="category-icon"
      style={{ backgroundColor: color }}
      title={name}
      aria-hidden="true"
    >
      {initial.toUpperCase()}
    </span>
  )
}
