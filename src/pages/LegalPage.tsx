import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import TermsContent from "@/components/legal/TermsContent";
import PrivacyContent from "@/components/legal/PrivacyContent";

type LegalSectionId = "terms" | "privacy";

const NAV_ITEMS: Array<{ id: LegalSectionId; label: string }> = [
  { id: "terms", label: "Terms & Conditions" },
  { id: "privacy", label: "Privacy Policy" },
];

const LegalPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = useState<LegalSectionId>("terms");

  const sectionIds = useMemo(() => NAV_ITEMS.map((item) => item.id), []);

  const getHeaderHeight = () => {
    if (typeof window === "undefined") return 80;
    const rawHeaderHeight = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
    const parsedHeaderHeight = Number.parseInt(rawHeaderHeight, 10);
    return Number.isNaN(parsedHeaderHeight) ? 80 : parsedHeaderHeight;
  };

  const getScrollOffset = () => {
    const headerHeight = getHeaderHeight();
    const stickyNavHeight = isMobile ? 0 : (navRef.current?.offsetHeight ?? 0);
    return headerHeight + stickyNavHeight + 18;
  };

  const scrollToSection = (id: LegalSectionId, behavior: ScrollBehavior = "smooth") => {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveSection(id);
    const targetTop = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
    window.scrollTo({ top: Math.max(targetTop, 0), behavior });
    window.history.replaceState(null, "", `/legal#${id}`);
  };

  useEffect(() => {
    const observerOffset = getScrollOffset();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveSection(visible[0].target.id as LegalSectionId);
        }
      },
      {
        threshold: [0.15, 0.35, 0.6],
        rootMargin: `-${observerOffset}px 0px -45% 0px`,
      },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds, isMobile]);

  useEffect(() => {
    const hash = location.hash.replace("#", "") as LegalSectionId;
    if (!sectionIds.includes(hash)) return;
    requestAnimationFrame(() => scrollToSection(hash, "smooth"));
  }, [location.hash]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#fcf8ea]">
        <SEO
          title="Terms & Privacy"
          description="Read BridgeArg legal terms and privacy policy."
          url="/legal"
        />
        <Header />
        <main>
          <section
            style={{
              padding: isMobile ? "44px 20px 36px" : isTablet ? "72px 32px 56px" : "80px clamp(24px, 7vw, 120px) 64px",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(30,21,23,0.62)",
                marginBottom: "22px",
                fontFamily: '"Onest", sans-serif',
              }}
            >
              Legal
            </p>
            <h1
              style={{
                margin: 0,
                fontFamily: '"Onest", sans-serif',
                fontWeight: 700,
                fontSize: isMobile ? "52px" : "clamp(64px, 9vw, 126px)",
                letterSpacing: "-0.06em",
                lineHeight: 0.9,
                color: "#1e1517",
              }}
            >
              <span style={{ display: "block" }}>Terms &</span>
              <span
                style={{
                  display: "inline-block",
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontWeight: 400,
                  color: "#7FB2D1",
                  transform: "rotate(-7deg)",
                  transformOrigin: "left center",
                }}
              >
                Privacy
              </span>
            </h1>
          </section>

          <nav
            ref={navRef}
            style={{
              position: isMobile ? "static" : "sticky",
              top: "var(--header-h)",
              zIndex: 20,
              backgroundColor: "rgba(127,178,209,0.95)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                padding: isMobile ? "14px 20px" : "16px clamp(24px, 7vw, 120px)",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id, "smooth")}
                    style={{
                      border: "1px solid rgba(252,248,234,0.6)",
                      backgroundColor: active ? "#fcf8ea" : "transparent",
                      color: active ? "#7FB2D1" : "#fcf8ea",
                      padding: "10px 14px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontFamily: '"Onest", sans-serif',
                      cursor: "pointer",
                      transition: "0.2s ease",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <section
            id="terms"
            style={{
              padding: isMobile ? "44px 20px" : isTablet ? "72px 32px" : "86px clamp(24px, 7vw, 120px)",
              scrollMarginTop: "calc(var(--header-h) + 140px)",
            }}
          >
            <div className="mx-auto max-w-3xl text-[rgba(30,21,23,0.82)]">
              <TermsContent />
            </div>
          </section>

          <div
            style={{
              height: "1px",
              backgroundColor: "rgba(30,21,23,0.18)",
              margin: isMobile ? "52px 20px" : "72px clamp(24px, 7vw, 120px)",
            }}
          />

          <section
            id="privacy"
            style={{
              padding: isMobile ? "44px 20px 70px" : isTablet ? "72px 32px 84px" : "86px clamp(24px, 7vw, 120px) 100px",
              scrollMarginTop: "calc(var(--header-h) + 140px)",
            }}
          >
            <div className="mx-auto max-w-3xl text-[rgba(30,21,23,0.82)]">
              <PrivacyContent />
            </div>
          </section>

          <section
            style={{
              backgroundColor: "#1e1517",
              backgroundImage:
                "radial-gradient(circle at 84% 22%, rgba(127,178,209,0.16), transparent 40%), linear-gradient(135deg, #1e1517 0%, #140e10 100%)",
              color: "#fcf8ea",
              padding: isMobile ? "56px 20px" : "80px clamp(24px, 7vw, 120px)",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: '"Onest", sans-serif',
                fontSize: isMobile ? "36px" : "clamp(44px, 5vw, 62px)",
                letterSpacing: "-0.05em",
                lineHeight: 1,
              }}
            >
              Questions about our policies?
            </h2>
            <Link
              to="/contact"
              className="inline-flex items-center border border-[#fcf8ea] text-[#fcf8ea] transition-colors duration-300 hover:bg-[#fcf8ea] hover:text-[#1e1517]"
              style={{
                marginTop: "30px",
                textDecoration: "none",
                padding: "13px 22px",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                fontSize: "11px",
                fontFamily: '"Onest", sans-serif',
              }}
            >
              Contact us
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default LegalPage;
