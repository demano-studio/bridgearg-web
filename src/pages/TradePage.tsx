import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { TradeApplicationForm } from "@/components/TradeApplicationForm";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SEO } from "@/components/SEO";
import { TRADE_SEGMENT_LIST, TRADE_STEPS } from "@/data/tradeSegments";
import { TRADE_IMAGES } from "@/data/tradeImages";
import "@/styles/trade.css";

const BAND_ITEMS = [
  "Dedicated contact",
  "15% trade pricing",
  "Certificate of authenticity",
  "Verified purchases",
] as const;

const RELY_ITEMS = [
  {
    title: "Original works, direct from the studio",
    body: "Argentine contemporary artists represented by BridgeArg. No prints, no reproductions.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="10" y="12" width="28" height="24" />
        <path d="M10 30l8-8 6 6 4-4 10 10" />
      </svg>
    ),
  },
  {
    title: "Documented authenticity",
    body: "Every work comes with documentation of authenticity, ready to share with your client.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M16 8h16l8 8v24H16V8z" />
        <path d="M32 8v8h8" />
        <path d="M20 26h12M20 32h8" />
      </svg>
    ),
  },
  {
    title: "Verified purchases",
    body: "Identity verification and protected payment on every acquisition.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M24 8l14 6v10c0 9-6 15-14 18-8-3-14-9-14-18V14l14-6z" />
        <path d="M18 24l4 4 8-8" />
      </svg>
    ),
  },
  {
    title: "One contact, start to finish",
    body: "A single point of contact from the first conversation to delivery.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <circle cx="24" cy="18" r="7" />
        <path d="M10 40c2.5-8 9-12 14-12s11.5 4 14 12" />
      </svg>
    ),
  },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TradePage = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash !== "apply" && hash !== "how") return;
    const t = window.setTimeout(() => scrollToId(hash), 80);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <PageTransition>
      <div className="trade-page min-h-screen">
        <SEO
          title="Trade Program"
          description="Artwork for your entire project — dedicated contact, curated selection, and 15% trade pricing for designers, architects, developers and art consultants."
          url="/trade"
        />
        <Header />
        <main>
          {/* 1. Hero */}
          <section className="trade-hero">
            <div className="trade-wrap trade-hero__grid">
              <div className="trade-hero__copy">
                <p className="trade-eyebrow trade-eyebrow--line">(Trade Program)</p>
                <h1>
                  Art for your
                  <br />
                  entire <u>project.</u>
                </h1>
                <span className="trade-script trade-hero__script">one contact, every piece</span>
                <p className="trade-hero__lead">
                  <strong>
                    Original contemporary art from Argentina's leading artists, selected for your project by a
                    dedicated contact,
                  </strong>{" "}
                  with <mark>15% trade pricing</mark> on every acquisition.
                </p>
                <div className="trade-hero__actions">
                  <a className="trade-btn" href="#apply">
                    Apply to the Trade Program <span className="arrow" aria-hidden="true">→</span>
                  </a>
                  <a className="trade-btn trade-btn--ghost" href="#how">
                    How it works
                  </a>
                </div>
              </div>

              <figure className="trade-hero__visual" style={{ margin: 0 }}>
                <div className="trade-arch trade-hero__arch">
                  <OptimizedImage
                    src={TRADE_IMAGES.hero.src}
                    alt={TRADE_IMAGES.hero.alt}
                    className="h-full w-full"
                    imageClassName="trade-arch-img !object-cover !object-center"
                    priority
                    sizes="(max-width: 900px) 90vw, 34vw"
                  />
                </div>
                <div className="trade-badge" aria-hidden="true">
                  <div>
                    <span className="trade-badge__pct">15%</span>
                    <span className="trade-badge__label">Trade pricing</span>
                  </div>
                </div>
                <figcaption className="trade-caption">
                  <span>{TRADE_IMAGES.hero.caption}</span>
                  <em>{TRADE_IMAGES.hero.captionMeta}</em>
                </figcaption>
              </figure>
            </div>
          </section>

          {/* 2. Band */}
          <div className="trade-band" aria-label="Program highlights">
            <div className="trade-band__track">
              {[0, 1].map((copy) => (
                <div key={copy} style={{ display: "contents" }}>
                  {BAND_ITEMS.map((item) => (
                    <span key={`${copy}-${item}`} className="trade-band__item">
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Who it's for */}
          <section className="trade-sec">
            <div className="trade-wrap">
              <span className="trade-num">01 — (WHO IT'S FOR)</span>
              <h2 className="trade-title" style={{ fontSize: "clamp(32px, 5vw, 64px)", maxWidth: "16ch" }}>
                <u>Made for</u> the people who shape spaces
              </h2>
              <p style={{ margin: "20px 0 0", maxWidth: "36em", color: "var(--trade-muted)" }}>
                One program, four ways of working. Choose the one closest to yours and we'll start from there.
              </p>

              <div className="trade-cards">
                {TRADE_SEGMENT_LIST.map((item, i) => {
                  const img = TRADE_IMAGES.cards[item.slug];
                  return (
                    <article key={item.slug} className="trade-card">
                      <div className="trade-arch trade-card__media">
                        <OptimizedImage
                          src={img.src}
                          alt={img.alt}
                          className="h-full w-full"
                          imageClassName="trade-arch-img !object-cover !object-center"
                          sizes="(max-width: 720px) 90vw, 25vw"
                        />
                      </div>
                      <span className="trade-card__n">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="trade-card__title">{item.cardTitle}</h3>
                      <p className="trade-card__body">{item.cardDescription}</p>
                      <Link to={item.path} className="trade-link">
                        Learn more <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. How it works */}
          <section id="how" className="trade-sec trade-dark" style={{ scrollMarginTop: "100px" }}>
            <div className="trade-wrap">
              <span className="trade-num">02 — (HOW IT WORKS)</span>
              <h2 className="trade-title" style={{ fontSize: "clamp(36px, 5.5vw, 72px)", marginBottom: "clamp(36px, 5vw, 64px)" }}>
                From brief to wall
              </h2>
              <div className="trade-how">
                <div className="trade-how__steps">
                  {TRADE_STEPS.map((step) => (
                    <div key={step.n} className="trade-step">
                      <span className="trade-step__n">{step.n}</span>
                      <h3 className="trade-step__title">{step.title}</h3>
                      <p className="trade-step__body">{step.body}</p>
                    </div>
                  ))}
                </div>
                <aside className="trade-how__panel" aria-label="Trade pricing">
                  <div className="trade-how__panel-label">(Trade pricing)</div>
                  <div className="trade-how__panel-pct">15%</div>
                  <p className="trade-how__panel-body">on every acquisition made through the program.</p>
                  <p className="trade-how__panel-note">
                    Applied with a personal promotion code, issued once your application is approved.
                  </p>
                </aside>
              </div>
            </div>
          </section>

          {/* 5. What you can rely on */}
          <section className="trade-sec">
            <div className="trade-wrap">
              <span className="trade-num">(WHAT YOU CAN RELY ON)</span>
              <h2 className="trade-title" style={{ fontSize: "clamp(32px, 5vw, 64px)", maxWidth: "14ch" }}>
                A bridge you can trust
              </h2>
              <div className="trade-pillars">
                {RELY_ITEMS.map((item) => (
                  <div key={item.title} className="trade-pillar">
                    <div className="trade-pillar__icon">{item.icon}</div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. Apply */}
          <section id="apply" className="trade-sec trade-apply" style={{ scrollMarginTop: "100px" }}>
            <div className="trade-wrap trade-apply__grid">
              <div className="trade-apply__side">
                <span className="trade-num">03 — (APPLY)</span>
                <h2 className="trade-title">
                  <u>Join</u>
                  <br />
                  the program
                </h2>
                <span className="trade-script trade-apply__script">bienvenidos</span>
                <p className="trade-apply__copy">
                  Tell us about your practice. We review every application personally and reply within 48 business
                  hours.
                </p>
                <p
                  className="trade-apply__copy"
                  style={{ marginTop: 12, fontSize: 13, color: "var(--trade-muted)" }}
                >
                  The Trade Program is for professionals sourcing art for projects or clients.
                </p>
                <div className="trade-apply__perk">
                  <span className="trade-apply__perk-arch" aria-hidden="true" />
                  <span>Approved applicants receive a personal code for 15% trade pricing.</span>
                </div>
              </div>
              <div className="trade-apply__form">
                <TradeApplicationForm />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default TradePage;
