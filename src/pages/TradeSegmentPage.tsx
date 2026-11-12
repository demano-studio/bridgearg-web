import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SEO } from "@/components/SEO";
import {
  getTradeSegment,
  TRADE_SEGMENT_LIST,
  TRADE_STEPS,
} from "@/data/tradeSegments";
import { TRADE_IMAGES } from "@/data/tradeImages";
import "@/styles/trade.css";

const TradeSegmentPage = () => {
  const { segment } = useParams<{ segment: string }>();
  const data = getTradeSegment(segment);

  if (!data) {
    return <Navigate to="/trade" replace />;
  }

  const cover = TRADE_IMAGES.covers[data.slug];
  const others = TRADE_SEGMENT_LIST.filter((s) => s.slug !== data.slug);

  return (
    <PageTransition>
      <div className="trade-page min-h-screen">
        <SEO
          title={data.metaTitle}
          description={data.metaDescription}
          url={data.path}
          exactTitle
        />
        <Header />
        <main>
          {/* Hero */}
          <section className="trade-hero">
            <div className="trade-wrap trade-hero__grid">
              <div className="trade-hero__copy">
                <Link to="/trade" className="trade-back">
                  ← Trade Program
                </Link>
                <p className="trade-eyebrow trade-eyebrow--line">(For {data.label})</p>
                <h1>
                  {data.h1a} <u>{data.h1u}</u>
                </h1>
                <p className="trade-hero__lead" style={{ fontWeight: 300 }}>
                  {data.intro}
                </p>
                <div className="trade-hero__actions">
                  <Link className="trade-btn" to="/trade#apply">
                    Apply to the Trade Program <span className="arrow" aria-hidden="true">→</span>
                  </Link>
                </div>
                <p style={{ marginTop: 16, fontSize: 14, color: "var(--trade-muted)" }}>
                  15% trade pricing on every acquisition
                </p>
              </div>

              <figure className="trade-hero__visual" style={{ margin: 0 }}>
                <div className="trade-arch trade-hero__arch">
                  <OptimizedImage
                    src={cover.src}
                    alt={cover.alt}
                    className="h-full w-full"
                    imageClassName="trade-arch-img !object-cover !object-center"
                    priority
                    sizes="(max-width: 900px) 90vw, 34vw"
                  />
                </div>
                <div className="trade-badge trade-badge--sm" aria-hidden="true">
                  <div>
                    <span className="trade-badge__pct">15%</span>
                    <span className="trade-badge__label">Trade pricing</span>
                  </div>
                </div>
              </figure>
            </div>
          </section>

          {/* 01 What we understand */}
          <section className="trade-sec">
            <div className="trade-wrap">
              <span className="trade-num">01 — (WHAT WE UNDERSTAND)</span>
              <p className="trade-understand">{data.understand}</p>
            </div>
          </section>

          {/* 02 How BridgeArg helps */}
          <section className="trade-sec trade-dark">
            <div className="trade-wrap">
              <span className="trade-num">02 — (HOW BRIDGEARG HELPS)</span>
              <h2 className="trade-title" style={{ fontSize: "clamp(36px, 5vw, 64px)" }}>
                What you get
              </h2>
              <div className="trade-help">
                {data.help.map((item, i) => (
                  <div key={item.title} className="trade-help__item">
                    <span className="trade-help__n">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="trade-help__title">{item.title}</h3>
                    <p className="trade-help__body">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 03 How it works */}
          <section className="trade-sec">
            <div className="trade-wrap">
              <span className="trade-num">03 — (HOW IT WORKS)</span>
              <h2 className="trade-title" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
                From brief to wall
              </h2>
              <div className="trade-steps-row">
                {TRADE_STEPS.map((step) => (
                  <div key={step.n} className="trade-step">
                    <span className="trade-step__n">{step.n}</span>
                    <h3 className="trade-step__title">{step.title}</h3>
                    <p className="trade-step__body">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Join band */}
          <section className="trade-sec trade-join">
            <div className="trade-wrap">
              <span className="trade-num">(JOIN THE PROGRAM)</span>
              <h2 className="trade-title">{data.cta}</h2>
              <p className="trade-join__copy">
                We review every application personally and reply within 48 business hours. Approved applicants
                receive a personal code for 15% trade pricing.
              </p>
              <div className="trade-join__actions">
                <Link className="trade-btn" to="/trade#apply">
                  Apply to the Trade Program <span className="arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Other profiles */}
          <section className="trade-sec">
            <div className="trade-wrap">
              <span className="trade-num">(OTHER PROFILES)</span>
              <div className="trade-others">
                {others.map((item) => (
                  <div key={item.slug} className="trade-other">
                    <h3 className="trade-other__title">{item.cardTitle}</h3>
                    <p className="trade-other__line">{item.shortLine}</p>
                    <Link to={item.path} className="trade-link">
                      Learn more <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default TradeSegmentPage;
