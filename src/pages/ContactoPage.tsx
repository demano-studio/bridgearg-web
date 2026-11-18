import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { ContactForm, CONTACT_SUBJECT_OPTIONS } from "@/components/ContactForm";
import "@/styles/contact.css";

const FRAME_PATH = "M0 0H285V60A227 227 0 0 0 58 287H0Z";

function CornerMark({ className }: { className: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 285 287" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d={FRAME_PATH} stroke="#fcf8ea" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

const ContactoPage = () => {
  const [searchParams] = useSearchParams();

  const obraParam = searchParams.get("obra");
  const artistaParam = searchParams.get("artista");
  const artworkParam = searchParams.get("artwork");
  const artistParam = searchParams.get("artist");
  const subjectParam = searchParams.get("subject");
  const isArtworkInquiryParam = subjectParam === "artwork-inquiry";

  const normalizedSubjectParam =
    subjectParam && (CONTACT_SUBJECT_OPTIONS as readonly string[]).includes(subjectParam)
      ? subjectParam
      : "";

  const initialSubject = normalizedSubjectParam
    ? normalizedSubjectParam
    : isArtworkInquiryParam
      ? "Artwork inquiry"
      : obraParam
        ? "Artwork inquiry"
        : artistaParam
          ? "Artist representation"
          : "";

  const initialMessage = isArtworkInquiryParam
    ? artworkParam?.trim() && artistParam?.trim()
      ? `Hi, I'm interested in ${artworkParam.trim()} by ${artistParam.trim()}. Could you share more details?`
      : ""
    : obraParam
      ? `I'm interested in the work: ${obraParam}`
      : artistaParam
        ? `I'd like to know more about: ${artistaParam}`
        : "";

  return (
    <PageTransition>
      <div className="contact-page min-h-screen">
        <SEO
          title="Contact"
          description="Get in touch with BridgeArg for artist inquiries, acquisitions, and more."
          url="/contact"
        />
        <Header />
        <main>
          <section className="contact-wrap contact-hero">
            <div>
              <p className="contact-eyebrow">(Get in touch)</p>
              <h1 className="contact-hero__title">
                Let&apos;s build the
                <span className="contact-hero__script">bridge.</span>
              </h1>
            </div>
            <div>
              <p className="contact-hero__lead">
                Whether you are interested in a work, an artist, or a possible collaboration, BridgeArg
                is here to guide the crossing with clarity and care.
              </p>
              <div className="contact-hero__aside">
                <strong className="contact-hero__aside-script">Every conversation starts with care.</strong>
                <p className="contact-hero__aside-copy">
                  Tell us what you are looking for — we will help you find the right piece, artist, or
                  path.
                </p>
              </div>
            </div>
          </section>

          <section className="contact-wrap contact-locations" aria-label="Locations">
            <div className="contact-locations__block">
              <p className="contact-eyebrow" style={{ marginBottom: 0 }}>
                Argentina
              </p>
              <span className="contact-locations__city">Córdoba</span>
            </div>
            <div className="contact-locations__block contact-locations__block--end">
              <p className="contact-eyebrow" style={{ marginBottom: 0 }}>
                United States
              </p>
              <span className="contact-locations__city">Plantation, FL</span>
            </div>
          </section>

          <section className="contact-wrap contact-grid">
            <div className="contact-form-col">
              <p className="contact-eyebrow">(Inquiry form)</p>
              <h2 className="contact-form-col__title">
                Write to us
                <span className="contact-form-col__script">hablemos</span>
              </h2>
              <p className="contact-form-col__copy">
                A simple way to begin a conversation about art, logistics, representation or
                collaboration.
              </p>
              <div className="contact-form-slot">
                <ContactForm initialSubject={initialSubject} initialMessage={initialMessage} />
              </div>
            </div>

            <aside className="contact-card" aria-label="BridgeArg contact">
              <CornerMark className="contact-card__corner contact-card__corner--tl" />
              <CornerMark className="contact-card__corner contact-card__corner--tr" />
              <CornerMark className="contact-card__corner contact-card__corner--bl" />
              <CornerMark className="contact-card__corner contact-card__corner--br" />

              <p className="contact-card__eyebrow">(BridgeArg contact)</p>
              <h2 className="contact-card__title">
                One route,
                <span className="contact-card__script">two shores.</span>
              </h2>
              <p className="contact-card__copy">
                BridgeArg works between Argentine studios and international collectors, managing each
                conversation with a curatorial and professional approach.
              </p>

              <div className="contact-card__row">
                <span className="contact-card__label">Email</span>
                <a className="contact-card__value" href="mailto:info@bridgearg.net">
                  info@bridgearg.net
                </a>
              </div>
              <div className="contact-card__row">
                <span className="contact-card__label">WhatsApp | iMessage | Text message</span>
                <p className="contact-card__value">+1 (954) 955-8861</p>
              </div>
              <div className="contact-card__row">
                <span className="contact-card__label">Córdoba</span>
                <p className="contact-card__value contact-card__value--soft">
                  Where artists, studios and works begin.
                </p>
              </div>
              <div className="contact-card__row">
                <span className="contact-card__label">Plantation, FL</span>
                <p className="contact-card__value contact-card__value--soft">
                  Where collectors, galleries and opportunities meet.
                </p>
              </div>
              <div className="contact-card__row">
                <span className="contact-card__label">Follow us</span>
                <div className="contact-card__links">
                  <a href="https://instagram.com/bridgearg_" target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                  <a href="https://linkedin.com/company/bridgearg" target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                </div>
              </div>
            </aside>
          </section>

          <section className="contact-close">
            <div className="contact-wrap">
              <p className="contact-close__eyebrow">(Argentina to the world)</p>
              <h2 className="contact-close__title">
                One conversation can start the{" "}
                <span className="contact-close__script">crossing.</span>
              </h2>
              <div className="contact-close__row">
                <p className="contact-close__copy">
                  From artwork inquiries to international collaborations, we create the professional
                  structure that lets Argentine art travel further.
                </p>
                <a className="contact-close__btn" href="#contact-full-name">
                  Start the conversation
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ContactoPage;
