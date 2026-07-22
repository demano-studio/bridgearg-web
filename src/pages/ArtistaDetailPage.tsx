import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { getArtistBySlug, getWorks } from "@/lib/api";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

function getBioParagraphs(bio: string | null | undefined): string[] {
  if (!bio) return [];
  return bio
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const QUICK_NAV = [
  { label: "Statement", href: "#statement" },
  { label: "Works", href: "#works" },
  { label: "Process", href: "#process" },
  { label: "Details", href: "#details" },
];

const ArtistaDetailPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { slug } = useParams<{ slug: string }>();

  const {
    data: artist = null,
    isLoading: loadingArtist,
    isError: artistError,
  } = useQuery({
    queryKey: ["artist", slug],
    queryFn: () => getArtistBySlug(slug!),
    enabled: !!slug,
  });

  const {
    data: works = [],
    isError: worksError,
  } = useQuery({
    queryKey: ["artistWorks", slug],
    queryFn: () => getWorks(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    if (artistError) {
      toast({ title: "Error", description: "Could not load artist.", variant: "destructive" });
    }
  }, [artistError]);

  useEffect(() => {
    if (worksError) {
      toast({ title: "Error", description: "Could not load works.", variant: "destructive" });
    }
  }, [worksError]);

  if (loadingArtist) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="flex min-h-[60svh] items-center justify-center bg-background px-6 py-24 md:px-12">
            <div className="flex items-center gap-4 text-[#1e1517]/55">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="font-display text-xs uppercase tracking-[0.18em]">Loading artist</span>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (!artist) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="bg-background px-6 py-32 md:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-[#1e1517] md:text-6xl">
                Artist not found
              </h1>
              <Link
                to="/artistas"
                className="mt-8 inline-flex items-center rounded-full border border-[#1e1517]/20 px-6 py-3 font-display text-xs uppercase tracking-[0.12em] text-[#1e1517] transition-colors hover:bg-[#1e1517] hover:text-[#fcf8ea]"
              >
                Back to Artists
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  const bioParagraphs = getBioParagraphs(artist.bio);
  const heroBio = bioParagraphs[0] ?? "Biography available on request.";
  const statementParagraphs = bioParagraphs.slice(0, 2);
  const metaTags = [artist.origin, artist.discipline].filter(
    (tag): tag is string => Boolean(tag),
  );
  const featuredWorks = works.slice(0, 3);
  const studioImageSrc = artist.studioImageUrl ?? artist.imageUrl ?? "";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title={artist.name}
          description={artist.bio ?? `Works and biography of ${artist.name}, contemporary Argentine artist.`}
          image={artist.imageUrl ?? undefined}
          url={`/artists/${artist.slug}`}
          type="article"
        />
        <Header />
        <main>
          {/* 1. HERO */}
          <section
            className="relative grid grid-cols-1 md:[grid-template-columns:1.05fr_0.95fr]"
            style={{
              minHeight: "auto",
              padding: isMobile
                ? "40px 20px"
                : "80px clamp(24px, 6vw, 96px) clamp(40px, 6vh, 80px)",
              gap: isMobile ? "24px" : "clamp(40px, 7vw, 100px)",
              alignItems: "end",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <Link
                to="/artistas"
                style={{
                  position: "relative",
                  zIndex: 10,
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "24px",
                  color: "rgba(30,21,23,0.55)",
                  borderBottom: "1px solid transparent",
                  paddingBottom: "2px",
                  cursor: "pointer",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#7FB2D1";
                  e.currentTarget.style.borderBottomColor = "#7FB2D1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(30,21,23,0.55)";
                  e.currentTarget.style.borderBottomColor = "transparent";
                }}
              >
                ← Back to Artists
              </Link>
              <h1 style={{ position: "relative", zIndex: 1, margin: "0 0 28px 0", lineHeight: 0.8 }}>
                {artist.name.split(" ").map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    style={{
                      display: "block",
                      fontFamily: '"BestDB", "Caveat", cursive',
                      fontSize: "clamp(74px, 10vw, 170px)",
                      fontWeight: 400,
                      lineHeight: 0.8,
                      letterSpacing: "-0.04em",
                      color: "#7FB2D1",
                      transform: "rotate(-7deg)",
                      transformOrigin: "left center",
                    }}
                  >
                    {word}
                  </span>
                ))}
              </h1>
              {metaTags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "28px",
                    flexWrap: "wrap",
                    marginBottom: "34px",
                  }}
                >
                  {metaTags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      style={{
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        borderTop: "1px solid #1e1517",
                        paddingTop: "10px",
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p
                style={{
                  maxWidth: "640px",
                  fontSize: "clamp(16px, 1.4vw, 20px)",
                  lineHeight: 1.45,
                  color: "rgba(30,21,23,0.74)",
                  margin: 0,
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                {artist.description ?? heroBio}
              </p>
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  backgroundColor: "#fcfcfc",
                  padding: "clamp(20px, 2.5vw, 34px)",
                  boxShadow: "0 28px 80px rgba(30,21,23,0.08)",
                  transform: "translateY(25px)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "clamp(420px, 62vh, 720px)",
                    overflow: "hidden",
                    filter: "saturate(0.92)",
                  }}
                >
                  <OptimizedImage
                    src={artist.detailImageUrl ?? artist.imageUrl ?? ""}
                    alt={artist.name}
                    className="!h-full !w-full"
                    imageClassName="h-full w-full object-cover"
                    logSrcOnError
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. QUICK NAV STICKY */}
          <nav
            style={{
              position: isMobile ? "static" : "sticky",
              top: "80px",
              zIndex: 12,
              backgroundColor: "rgba(127,178,209,0.95)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              display: "flex",
              justifyContent: "center",
              gap: "clamp(20px, 4vw, 48px)",
              padding: isMobile ? "14px 12px" : "18px 24px",
            }}
          >
            {QUICK_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[#fcf8ea] opacity-75 hover:opacity-100 hover:text-[#1e1517] transition-all duration-200"
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* 3. STATEMENT */}
          <section
            id="statement"
            className="grid grid-cols-1 md:[grid-template-columns:0.8fr_1.2fr]"
            style={{
              padding: isMobile
                ? "40px 20px"
                : "clamp(60px, 12vh, 120px) clamp(24px, 6vw, 96px)",
              gap: isMobile ? "24px" : "clamp(40px, 7vw, 100px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.17em",
                  color: "rgba(30,21,23,0.55)",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Artist statement
              </span>
            </div>
            <div>
              <h2
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(28px, 4vw, 66px)",
                  fontWeight: 400,
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  margin: "0 0 28px 0",
                  color: "#1e1517",
                }}
              >
                {artist.statement || "Objects that hold memory, texture and origin."}
              </h2>
              {(statementParagraphs.length > 0 ? statementParagraphs : [heroBio]).map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: "clamp(15px, 1.2vw, 18px)",
                    lineHeight: 1.7,
                    color: "rgba(30,21,23,0.72)",
                    margin: "0 0 22px 0",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  {p}
                </p>
              ))}
              <span
                style={{
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontSize: "clamp(28px, 3vw, 38px)",
                  lineHeight: 1.05,
                  color: "#7FB2D1",
                  marginTop: "44px",
                  transform: "rotate(-4deg)",
                  display: "inline-block",
                }}
              >
                The material always speaks first.
              </span>
            </div>
          </section>

          {/* 4. WORKS */}
          <section
            id="works"
            style={{
              padding: isMobile
                ? "40px 20px"
                : "clamp(60px, 12vh, 120px) clamp(24px, 6vw, 96px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "end",
                justifyContent: "space-between",
                marginBottom: "34px",
                flexWrap: "wrap",
                gap: "20px",
              }}
            >
              <h2
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(36px, 5vw, 54px)",
                  fontWeight: 400,
                  letterSpacing: "-0.05em",
                  margin: 0,
                  color: "#1e1517",
                }}
              >
                Available works
              </h2>
            </div>

            {featuredWorks.length === 0 ? (
              <p
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "rgba(30,21,23,0.55)",
                }}
              >
                No works available yet.
              </p>
            ) : (
              <div
                className="grid grid-cols-1 md:[grid-template-columns:1.1fr_0.9fr_1fr]"
                style={{
                  gap: isMobile ? "20px" : "34px",
                  alignItems: "start",
                  gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1.1fr 0.9fr 1fr",
                }}
              >
                {featuredWorks.map((work, i) => {
                  const offsetClass =
                    i === 1 ? "md:mt-[90px]" : i === 2 ? "md:mt-[28px]" : "";
                  return (
                    <Link
                      key={work.id}
                      to={`/artworks/${work.id}`}
                      className={`group block hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(30,21,23,0.08)] ${offsetClass}`}
                      style={{
                        backgroundColor: "#fcfcfc",
                        padding: "24px",
                        cursor: "pointer",
                        transition: "transform 0.35s ease, box-shadow 0.35s ease",
                        position: "relative",
                        overflow: "hidden",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "430px",
                          overflow: "hidden",
                          backgroundColor: "rgba(30,21,23,0.04)",
                        }}
                      >
                        <OptimizedImage
                          src={work.imagenUrl ?? ""}
                          title={work.title}
                          artistName={artist.name}
                          variant="artwork"
                          className="!h-full !w-full"
                          imageClassName="!h-full !w-full !object-contain !object-center transition-[filter] duration-500 ease-out !saturate-[0.86] !contrast-[0.95] group-hover:!saturate-100 group-hover:!contrast-100"
                          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                          priority={i < 6}
                          logSrcOnError
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "20px",
                          marginTop: "18px",
                          fontSize: "14px",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontFamily: '"Onest", sans-serif',
                          color: "#1e1517",
                        }}
                      >
                        <span>{work.title}</span>
                        <em
                          style={{
                            color: "rgba(30,21,23,0.55)",
                            fontStyle: "normal",
                          }}
                        >
                          {work.priceDisplay}
                        </em>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {works.length > 3 && (
              <div
                style={{
                  marginTop: "clamp(40px, 6vh, 60px)",
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                <Link
                  to={`/artworks?artist=${encodeURIComponent(artist.name)}`}
                  style={{
                    fontFamily: '"Onest", sans-serif',
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "#1e1517",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(30,21,23,0.4)",
                    paddingBottom: "4px",
                    transition: "color 0.3s ease, letter-spacing 0.3s ease, border-color 0.3s ease",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.color = "#7FB2D1";
                    el.style.borderBottomColor = "#7FB2D1";
                    el.style.letterSpacing = "0.25em";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.color = "#1e1517";
                    el.style.borderBottomColor = "rgba(30,21,23,0.4)";
                    el.style.letterSpacing = "0.18em";
                  }}
                >
                  View all works by {artist.name} →
                </Link>
              </div>
            )}
          </section>

          {/* 5. PROCESS */}
          <section
            id="process"
            className="grid grid-cols-1 md:grid-cols-2"
            style={{
              gap: isMobile ? "20px" : "34px",
              backgroundColor: "#1e1517",
              color: "#fcf8ea",
            }}
          >
            <div style={{ padding: "clamp(40px, 6vh, 80px) clamp(24px, 4vw, 64px)" }}>
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.17em",
                  color: "rgba(252,248,234,0.55)",
                  fontFamily: '"Onest", sans-serif',
                  marginBottom: "16px",
                }}
              >
                Process
              </span>
              <h2
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(36px, 4.5vw, 56px)",
                  fontWeight: 400,
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  margin: "0 0 24px 0",
                  color: "#fcf8ea",
                }}
              >
                The hand behind the piece.
              </h2>
              <p
                style={{
                  lineHeight: 1.7,
                  color: "rgba(252,248,234,0.72)",
                  fontSize: "clamp(14px, 1.3vw, 17px)",
                  fontFamily: '"Onest", sans-serif',
                  margin: 0,
                }}
              >
                Each piece begins with long observation: the wood, the clay, the texture of the day.
                Tools stay simple, time stays generous. The studio is where intuition meets discipline,
                and where every object is shaped one decision at a time.
              </p>
              <a
                href="#works"
                className="inline-flex items-center gap-3 border border-[#fcf8ea] text-[#fcf8ea] hover:bg-[#fcf8ea] hover:text-[#1e1517] transition-colors duration-300"
                style={{
                  padding: "14px 22px",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.13em",
                  marginTop: "32px",
                  fontFamily: '"Onest", sans-serif',
                  textDecoration: "none",
                }}
              >
                View works →
              </a>
            </div>
            <div style={{ minHeight: "260px" }}>
              <OptimizedImage
                src={studioImageSrc}
                alt={`${artist.name} studio`}
                className="!h-full !w-full"
                imageClassName="h-full w-full object-cover"
                logSrcOnError
              />
            </div>
          </section>

          {/* 6. DETAILS */}
          <section
            id="details"
            className="grid grid-cols-1 md:grid-cols-4"
            style={{
              borderTop: "1px solid rgba(30,21,23,0.16)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)",
            }}
          >
            {[
              { label: "Discipline", value: artist.discipline ?? "—" },
              { label: "Origin", value: artist.origin ?? "Argentina" },
              { label: "Shipping", value: "Available to U.S." },
              { label: "Certificate", value: "Included" },
            ].map((cell) => (
              <div
                key={cell.label}
                className="border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                style={{
                  padding: "42px 28px",
                  borderColor: "rgba(30,21,23,0.16)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "rgba(30,21,23,0.45)",
                    marginBottom: "14px",
                    fontSize: "11px",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  {cell.label}
                </span>
                <strong
                  style={{
                    fontSize: "20px",
                    fontWeight: 400,
                    fontFamily: '"Onest", sans-serif',
                    color: "#1e1517",
                  }}
                >
                  {cell.value}
                </strong>
              </div>
            ))}
          </section>

          {/* 7. CTA */}
          <section
            style={{
              minHeight: isMobile ? "auto" : "55vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              position: "relative",
              padding: isMobile
                ? "40px 20px"
                : "clamp(60px, 12vh, 120px) clamp(24px, 6vw, 96px)",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontSize: "clamp(48px, 8vw, 140px)",
                  fontWeight: 400,
                  lineHeight: 0.82,
                  color: "#7FB2D1",
                  margin: "0 0 24px 0",
                  transform: "rotate(-4deg)",
                  display: "inline-block",
                }}
              >
                Bring this story home.
              </h2>
              <p
                style={{
                  maxWidth: "580px",
                  margin: "0 auto 30px",
                  color: "rgba(30,21,23,0.7)",
                  fontSize: "clamp(15px, 1.2vw, 18px)",
                  fontFamily: '"Onest", sans-serif',
                  lineHeight: 1.6,
                }}
              >
                BridgeArg handles documentation, packaging and shipping so each piece can travel safely across borders.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-3 border border-[#1e1517] text-[#1e1517] hover:bg-[#1e1517] hover:text-[#fcf8ea] transition-colors duration-300"
                style={{
                  padding: "14px 22px",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.13em",
                  fontFamily: '"Onest", sans-serif',
                  textDecoration: "none",
                }}
              >
                Inquire about this artist →
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtistaDetailPage;
