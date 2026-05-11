import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="footer-home" to="/">
          Home
        </Link>
      </div>
    </footer>
  )
}
