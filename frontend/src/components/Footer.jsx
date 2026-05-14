import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import './Logo.css'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" id="site-footer">
      <div className="site-footer-bar">
        <div className="site-footer-bar-inner site-footer-bar-inner--simple">
          <p className="site-footer-copy">© {year} Courage.</p>
          <Link className="site-footer-brand-mark" to="/" aria-label="Courage home">
            <Logo size="sm" variant="wordmark" />
          </Link>
        </div>
      </div>
    </footer>
  )
}
