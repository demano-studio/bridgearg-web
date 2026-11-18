import { Link } from "react-router-dom";
import { NewsletterForm } from "@/components/NewsletterForm";
import "@/styles/footer.css";

const logoSrc = encodeURI("/assets/logos/BRIDGEARG - Exportacion logos-06.svg");

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__shell">
        <div className="site-footer__card">
          {/* Top: lockup + social */}
          <div className="site-footer__top">
            <Link to="/" className="site-footer__logo" aria-label="BridgeArg">
              {/* Crop empty canvas in logos-06 so the lockup reads at ~48px */}
              <svg
                className="site-footer__logo-svg"
                viewBox="42 49 217 28"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-hidden="true"
              >
                <title>BridgeArg</title>
                <image href={logoSrc} x="0" y="0" width="300" height="132" />
              </svg>
            </Link>
            <div className="site-footer__social">
              {/* TODO: Reemplazar con URLs reales de redes sociales */}
              {/* Instagram: https://www.instagram.com/bridgearg_ */}
              {/* LinkedIn: https://www.linkedin.com/company/bridgearg */}
              <a
                href="https://instagram.com/bridgearg_"
                target="_blank"
                rel="noopener noreferrer"
              >
                @bridgearg_
              </a>
              <a
                href="https://linkedin.com/company/bridgearg"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>

          {/* Columns */}
          <div className="site-footer__cols">
            <div>
              <h4 className="site-footer__heading">Navigation</h4>
              <nav className="site-footer__nav" aria-label="Footer">
                <Link to="/artistas">Artists</Link>
                <Link to="/artworks">Collection</Link>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/trade">Trade Program</Link>
              </nav>
            </div>

            <div>
              <h4 className="site-footer__heading">Contact</h4>
              <div className="site-footer__contact">
                <p className="site-footer__email">info@bridgearg.net</p>
                <div>
                  <p className="site-footer__place-label">Argentina</p>
                  <p className="site-footer__place-text">Cordoba, Argentina</p>
                </div>
                <div>
                  <p className="site-footer__place-label">United States</p>
                  <p className="site-footer__place-text">Plantation, FL, United States</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="site-footer__heading">Newsletter</h4>
              <p className="site-footer__newsletter-copy">
                Stay updated on new arrivals and exhibitions.
              </p>
              <NewsletterForm source="footer" variant="footer" />
            </div>
          </div>

          {/* Payments */}
          <div className="site-footer__payments">
            <p className="site-footer__stripe">Secure checkout powered by Stripe</p>
            <p className="site-footer__cards">Visa · Mastercard · Amex</p>
          </div>

          {/* Copyright + legal */}
          <div className="site-footer__bottom">
            <p className="site-footer__copy">© 2026 BridgeArg</p>
            <p className="site-footer__legal">
              <Link to="/legal#terms">Terms &amp; Conditions</Link>
              <span className="site-footer__legal-sep">·</span>
              <Link to="/legal#privacy">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
