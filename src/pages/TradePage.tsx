import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { TradeApplicationForm } from "@/components/TradeApplicationForm";
import { OptimizedImage } from "@/components/OptimizedImage";
import { SEO } from "@/components/SEO";
import { getWorks } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { TRADE_SEGMENT_LIST, TRADE_STEPS } from "@/data/tradeSegments";

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

const TradePage = () => {
  const isMobile = useIsMobile();
  const { data: works = [] } = useQuery({
    queryKey: ["works"],
    queryFn: () => getWorks(),
  });
  const accentWorks = works.filter((w) => w.imagenUrl).slice(0, 4);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Trade Program"
          description="Artwork for your entire project — dedicated advisor, curated selection, and 15% trade pricing for designers, architects, developers and art consultants."
          url="/trade"
        />
        <Header />
        <main>
          {/* 1. Hero */}
          <section
            style={{
              minHeight: isMobile ? "auto" : "100vh",
              padding: isMobile
                ? "100px 20px 48px"
                : "clamp(120px, 18vh, 180px) clamp(24px, 7vw, 120px) clamp(60px, 10vh, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p style={eyebrowStyle}>For trade professionals</p>
            <h1
              style={{
                margin: 0,
                fontFamily: '"Onest", sans-serif',
                fontSize: isMobile ? "48px" : "clamp(64px, 9vw, 120px)",
                lineHeight: 0.9,
                letterSpacing: "-0.06em",
                fontWeight: 700,
                color: "#1e1517",
                maxWidth: "18ch",
              }}
            >
              Trade Program
            </h1>
            <p
              style={{
                marginTop: "28px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(22px, 3vw, 36px)",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "#1e1517",
                maxWidth: "28ch",
                fontWeight: 500,
              }}
            >
              Artwork for your entire project, all in one place.
            </p>
            <p
              style={{
                marginTop: "20px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "17px",
                lineHeight: 1.7,
                color: "rgba(30,21,23,0.65)",
                maxWidth: "540px",
              }}
            >
              A dedicated advisor, a curated selection, and 15% trade pricing on every acquisition —
              coordinated to your project timeline.
            </p>
            <div style={{ marginTop: "36px" }}>
              <button type="button" onClick={scrollToForm} className={ctaClass}>
                Apply to the Trade Program
              </button>
            </div>
          </section>

          {/* 2. Audiences */}
          <section
            style={{
              padding: isMobile
                ? "48px 20px"
                : "clamp(64px, 10vh, 100px) clamp(24px, 7vw, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
            }}
          >
            <p style={eyebrowStyle}>Who it's for</p>
            <h2
              style={{
                margin: "0 0 40px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(28px, 4vw, 48px)",
                letterSpacing: "-0.04em",
                fontWeight: 600,
                color: "#1e1517",
                maxWidth: "18ch",
              }}
            >
              Built for professionals who place art in real projects.
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TRADE_SEGMENT_LIST.map((item, i) => {
                const work = accentWorks[i];
                return (
                  <article
                    key={item.slug}
                    style={{
                      border: "1px solid rgba(30,21,23,0.16)",
                      backgroundColor: "rgba(255,255,255,0.35)",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "100%",
                    }}
                  >
                    {work ? (
                      <div style={{ aspectRatio: "4 / 5", overflow: "hidden", backgroundColor: "#e8e4d8" }}>
                        <OptimizedImage
                          src={work.imagenUrl}
                          alt=""
                          aspectRatio="4/5"
                          className="h-full w-full"
                          imageClassName="!object-cover"
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
                    <div style={{ padding: "22px 20px 26px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h3
                        style={{
                          margin: "0 0 12px",
                          fontFamily: '"Onest", sans-serif',
                          fontSize: "15px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#1e1517",
                          fontWeight: 600,
                        }}
                      >
                        {item.cardTitle}
                      </h3>
                      {item.cardLines.map((line) => (
                        <p
                          key={line}
                          style={{
                            margin: "0 0 8px",
                            fontFamily: '"Onest", sans-serif',
                            fontSize: "14px",
                            lineHeight: 1.55,
                            color: "rgba(30,21,23,0.68)",
                          }}
                        >
                          {line}
                        </p>
                      ))}
                      <Link
                        to={item.path}
                        className="mt-auto pt-4 font-display text-[11px] uppercase tracking-[0.16em] text-[#1e1517] underline decoration-[rgba(30,21,23,0.3)] underline-offset-4 transition-colors hover:text-[#7FB2D1] hover:decoration-[#7FB2D1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1517]"
                      >
                        Learn More
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* 3. Process */}
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

          {/* 4. Form */}
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
                    margin: 0,
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
              </div>
              <TradeApplicationForm />
            </div>
          </section>

          {/* 5. Closing CTA */}
          <section
            style={{
              padding: isMobile ? "56px 20px 72px" : "90px clamp(24px, 7vw, 120px) 110px",
              textAlign: "center",
              background:
                "radial-gradient(circle at 70% 20%, rgba(127,178,209,0.18), transparent 42%), #fcf8ea",
            }}
          >
            <h2
              style={{
                margin: "0 auto 18px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(28px, 4vw, 48px)",
                letterSpacing: "-0.04em",
                fontWeight: 600,
                color: "#1e1517",
                maxWidth: "18ch",
              }}
            >
              Ready to start a selection?
            </h2>
            <p
              style={{
                margin: "0 auto 32px",
                fontFamily: '"Onest", sans-serif',
                fontSize: "16px",
                lineHeight: 1.65,
                color: "rgba(30,21,23,0.65)",
                maxWidth: "42ch",
              }}
            >
              Apply once. Work with a dedicated advisor across every acquisition for the project.
            </p>
            <button type="button" onClick={scrollToForm} className={ctaClass}>
              Apply to the Trade Program
            </button>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default TradePage;
