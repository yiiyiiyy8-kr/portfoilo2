import footerImg from '../assets/desktop9/footer-image.png'
import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <img src={footerImg} alt="" className="site-footer__image" aria-hidden="true" />
      <p className="site-footer__wordmark">JAEYOUNGCHO</p>
    </footer>
  )
}

export default Footer
