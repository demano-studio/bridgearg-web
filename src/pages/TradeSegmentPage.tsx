import type { CSSProperties } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { TradeApplicationForm } from "@/components/TradeApplicationForm";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SEO } from "@/components/SEO";
import { getWorks } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getTradeSegment,
  TRADE_SEGMENT_SLUGS,
  TRADE_STEPS,
  type TradeSegmentSlug,
} from "@/data/tradeSegments";

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: "rgba(30,21,23,0.62)",
  marginBottom: "24px",
  fontFamily: '"Onest", sans-serif',
};

const ctaClass =
  "inline-flex items-center justify-center border border-[#7FB2D1] bg-[#7FB2D1] px-8 py-4 font-display text-xs uppercase tracking-[0.18em] text-[#1e1517] transition-colors hover:bg-[#7FB2D1]/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1517]";

function scrollToForm() {
  document.getElementById("trade-apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TradeSegmentPage = () => {
  const { segment } = useParams<{ segment: string }>();
  const isMobile = useIsMobile();
  const data = getTradeSegment(segment);

  const segmentIndex = data
    ? TRADE_SEGMENT_SLUGS.indexOf(data.slug as TradeSegmentSlug)
    : 0;

  const { data: works = [] } = useQuery({
    queryKey: ["works"],
    queryFn: () => getWorks(),
    enabled: Boolean(data),
  });
  const heroWork = works.filter((w) => w.imagenUrl)[segmentIndex] ?? works.find((w) => w.imagenUrl);

  if (!data) {
    return <Navigate to="/trade" replace />;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title={data.metaTitle}
          description={data.metaDescription}
          url={data.path}
          exactTitle
        />
        <Header />
        <main>
          {/* Hero */}
          <section
            style={{
              minHeight: isMobile ? "auto" : "100vh",
              padding: isMobile
                ? "100px 20px 48px"
                : "clamp(120px, 18vh, 180px) clamp(24px, 7vw, 120px) clamp(60px, 10vh, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr",
              gap: isMobile ? "36px" : "clamp(40px, 6vw, 80px)",
              alignItems: "center",
            }}
          >
            <div>
              <p style={eyebrowStyle}>Trade Program · {data.cardTitle}</p>
              <h1
                style={{
                  margin: 0,
                  fontFamily: '"Onest", sans-serif',
                  fontSize: isMobile ? "36px" : "clamp(42px, 5.5vw, 72px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.05em",
                  fontWeight: 700,
                  color: "#1e1517",
                  maxWidth: "16ch",
                }}
              >
                {data.h1}
              </h1>
              <p
                style={{
                  marginTop: "24px",
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "17px",
                  lineHeight: 1.7,
                  color: "rgba(30,21,23,0.65)",
                  maxWidth: "540px",
                }}
              >
                {data.intro}
              </p>
              <div style={{ marginTop: "32px" }}>
                <button type="button" onClick={scrollToForm} className={ctaClass}>
                  Apply to the Trade Program
                </button>
              </div>
            </div>

            {heroWork ? (
              <div style={{ aspectRatio: "4 / 5", overflow: "hidden", backgroundColor: "#e8e4d8" }}>
                <OptimizedImage
                  src={heroWork.imagenUrl}
                  alt=""
                  aspectRatio="4/5"
                  className="h-full w-full"
                  imageClassName="!object-cover"
                  priority
                />
              </div>
            ) : (
              <div
                aria-hidden
                style={{
                  aspectRatio: "4 / 5",
                  background:
                    "linear-gradient(160deg, rgba(127,178,209,0.22) 0%, rgba(252,248,234,0.9) 55%, rgba(30,21,23,0.06) 100%)",
                }}
              />
            )}
          </section>

          {/* What we understand */}
          <section
            style={{
              padding: isMobile
                ? "48px 20px"
                : "clamp(64px, 10vh, 100px) clamp(24px, 7vw, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
            }}
          >
            <p style={eyebrowStyle}>What we understand</p>
            <p
              style={{
                margin: 0,
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(22px, 3vw, 34px)",
                lineHeight: 1.25,
                letterSpacing: "-0.03em",
                color: "#1e1517",
                fontWeight: 500,
                maxWidth: "28ch",
              }}
            >
              {data.understand}
            </p>
          </section>

          {/* How BridgeArg helps */}
          <section
            style={{
              padding: isMobile
                ? "48px 20px"
                : "clamp(64px, 10vh, 100px) clamp(24px, 7vw, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
            }}
          >
            <p style={eyebrowStyle}>How BridgeArg helps</p>
            <h2
              style={{
                margin: "0 0 36px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(28px, 4vw, 48px)",
                letterSpacing: "-0.04em",
                fontWeight: 600,
                color: "#1e1517",
              }}
            >
              Built around how you work.
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {data.help.map((item, i) => (
                <div key={item.title}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: '"Onest", sans-serif',
                      fontSize: "12px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "#7FB2D1",
                      marginBottom: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    style={{
                      margin: "0 0 10px",
                      fontFamily: '"Onest", sans-serif',
                      fontSize: "20px",
                      letterSpacing: "-0.02em",
                      color: "#1e1517",
                      fontWeight: 600,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: '"Onest", sans-serif',
                      fontSize: "15px",
                      lineHeight: 1.65,
                      color: "rgba(30,21,23,0.68)",
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section
            style={{
              padding: isMobile
                ? "48px 20px"
                : "clamp(64px, 10vh, 100px) clamp(24px, 7vw, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              backgroundColor: "rgba(127,178,209,0.08)",
            }}
          >
            <p style={{ ...eyebrowStyle, color: "rgba(30,21,23,0.55)" }}>How it works</p>
            <h2
              style={{
                margin: "0 0 40px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(28px, 4vw, 48px)",
                letterSpacing: "-0.04em",
                fontWeight: 600,
                color: "#1e1517",
              }}
            >
              Three steps. Clear from the start.
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
              {TRADE_STEPS.map((step) => (
                <div key={step.n}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: '"Onest", sans-serif',
                      fontSize: "12px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "#7FB2D1",
                      marginBottom: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {step.n}
                  </span>
                  <h3
                    style={{
                      margin: "0 0 12px",
                      fontFamily: '"Onest", sans-serif',
                      fontSize: "clamp(24px, 3vw, 32px)",
                      letterSpacing: "-0.03em",
                      color: "#1e1517",
                      fontWeight: 600,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: '"Onest", sans-serif',
                      fontSize: "15px",
                      lineHeight: 1.65,
                      color: "rgba(30,21,23,0.68)",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Form */}
          <section
            id="trade-apply"
            style={{
              padding: isMobile
                ? "48px 20px 64px"
                : "clamp(64px, 10vh, 100px) clamp(24px, 7vw, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              scrollMarginTop: "100px",
            }}
          >
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:items-start">
              <div>
                <p style={eyebrowStyle}>Application</p>
                <h2
                  style={{
                    margin: "0 0 16px",
                    fontFamily: '"Onest", sans-serif',
                    fontSize: "clamp(28px, 4vw, 44px)",
                    letterSpacing: "-0.04em",
                    fontWeight: 600,
                    color: "#1e1517",
                  }}
                >
                  Tell us about your project.
                </h2>
                <p
                  style={{
                    margin: "0 0 28px",
                    fontFamily: '"Onest", sans-serif',
                    fontSize: "16px",
                    lineHeight: 1.7,
                    color: "rgba(30,21,23,0.65)",
                    maxWidth: "42ch",
                  }}
                >
                  Share a few details and we'll follow up within 48 business hours with next steps
                  for your Trade Program access.
                </p>
                <Link
                  to="/trade"
                  className="font-display text-xs uppercase tracking-[0.18em] text-[#1e1517] underline decoration-[rgba(30,21,23,0.35)] underline-offset-4 transition-colors hover:text-[#7FB2D1] hover:decoration-[#7FB2D1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1517]"
                >
                  ← Back to Trade Program
                </Link>
              </div>
              <TradeApplicationForm defaultRole={data.role} />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default TradeSegmentPage;
