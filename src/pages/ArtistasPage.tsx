import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getArtists, getWorks, type ArtistFromApi, type WorkFromApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { images } from "@/lib/images";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

type ArtistCard = {
  artist: ArtistFromApi;
  featuredWork: WorkFromApi | null;
};

const ArtistasPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { data: artists = [], isError: artistsError } = useQuery({
    queryKey: ["artists"],
    queryFn: getArtists,
  });

  const { data: works = [], isError: worksError } = useQuery({
    queryKey: ["works"],
    queryFn: () => getWorks(),
  });

  useEffect(() => {
    if (artistsError || worksError) {
      toast({ title: "Error", description: "Could not load artists.", variant: "destructive" });
    }
  }, [artistsError, worksError]);

  const artistCards = useMemo<ArtistCard[]>(() => {
    const featuredWorkByArtistSlug = new Map<string, WorkFromApi>();
    for (const work of works) {
      if (!featuredWorkByArtistSlug.has(work.artistSlug)) {
        featuredWorkByArtistSlug.set(work.artistSlug, work);
      }
    }
    return artists.map((artist) => ({
      artist,
      featuredWork: featuredWorkByArtistSlug.get(artist.slug) ?? null,
    }));
  }, [artists, works]);

  const disciplines = useMemo(() => {
    const unique = [...new Set(artists.map((a) => a.discipline).filter(Boolean))];
    return unique.sort();
  }, [artists]);

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filteredAndSortedArtistCards = useMemo(() => {
    const filtered = artistCards.filter((c) => {
      if (activeFilter === "all") return true;
      if (c.artist.discipline === activeFilter) return true;
      if (c.artist.discipline === "Mixed Media" && activeFilter !== "Hand-Embroidered") return true;
      return false;
    });
    return [...filtered].sort((a, b) => {
      const cmp = a.artist.name.trim().localeCompare(b.artist.name.trim(), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [artistCards, activeFilter, sortOrder]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Artists"
          description="Discover contemporary Argentine artists represented by BridgeArg."
          url="/artists"
        />
        <Header />
        <main>
          {/* 1. HERO */}
          <section
            style={{
              minHeight: isMobile ? "auto" : "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingTop: isMobile ? "100px" : "clamp(120px, 18vh, 180px)",
              paddingLeft: isMobile ? "20px" : "clamp(24px, 7vw, 120px)",
              paddingRight: isMobile ? "20px" : "clamp(24px, 7vw, 120px)",
              paddingBottom: isMobile ? "40px" : "clamp(60px, 10vh, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              position: "relative",
              overflow: "hidden",
              backgroundImage: `linear-gradient(rgba(30,21,23,0.45), rgba(30,21,23,0.45)), url('${images.fondoArtistas}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 1,
                maxWidth: isMobile ? "100%" : "min(700px, 60%)",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  marginBottom: "24px",
                  color: "rgba(252,248,234,0.7)",
                }}
              >
                Curated Argentine Talent
              </span>
              <h1
                style={{
                  margin: 0,
                  maxWidth: "900px",
                  fontSize: "clamp(72px, 11vw, 170px)",
                  letterSpacing: "-0.065em",
                  lineHeight: 0.82,
                  fontWeight: 600,
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                <span style={{ display: "block", color: "#fcf8ea" }}>Artists</span>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: '"BestDB", "Caveat", cursive',
                    color: "#7FB2D1",
                    fontWeight: 400,
                    transform: "rotate(-7deg)",
                    transformOrigin: "left center",
                  }}
                >
                  who cross
                </span>
                <span style={{ display: "block", color: "#fcf8ea" }}>bridges</span>
              </h1>
              <p
                style={{
                  maxWidth: "510px",
                  fontSize: "clamp(15px, 1.4vw, 18px)",
                  lineHeight: 1.65,
                  color: "rgba(252,248,234,0.85)",
                  marginTop: "36px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                A curated selection of Argentine artists whose work carries craft, memory and identity beyond borders.
              </p>
            </div>
          </section>

          {/* 2. FILTROS STICKY */}
          <div
            style={{
              position: isMobile ? "static" : "sticky",
              top: "80px",
              zIndex: 30,
              backgroundColor: "rgba(127,178,209,0.95)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              padding: isMobile ? "16px 20px" : "clamp(20px, 3vh, 34px) clamp(24px, 7vw, 120px)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {["All", ...disciplines].map((disc) => (
                <button
                  key={disc}
                  type="button"
                  onClick={() => setActiveFilter(disc === "All" ? "all" : disc)}
                  style={{
                    backgroundColor:
                      activeFilter === (disc === "All" ? "all" : disc) ? "#fcf8ea" : "transparent",
                    border: "1px solid rgba(252,248,234,0.6)",
                    borderRadius: "0",
                    color: activeFilter === (disc === "All" ? "all" : disc) ? "#7FB2D1" : "#fcf8ea",
                    padding: "9px 16px",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    cursor: "pointer",
                    transition: "0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeFilter !== (disc === "All" ? "all" : disc)) {
                      e.currentTarget.style.backgroundColor = "#fcf8ea";
                      e.currentTarget.style.color = "#7FB2D1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeFilter !== (disc === "All" ? "all" : disc)) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#fcf8ea";
                    }
                  }}
                >
                  {disc}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {(["asc", "desc"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setSortOrder(dir)}
                  className="border border-solid rounded-none text-[12px] uppercase tracking-[0.12em] cursor-pointer font-['Onest',sans-serif] transition-all duration-200 ease-out px-4 py-[9px] border-[rgba(252,248,234,0.6)] bg-transparent text-[#fcf8ea] hover:border-[#fcf8ea] hover:bg-[#fcf8ea] hover:text-[#7FB2D1]"
                >
                  {dir === "asc" ? "A → Z" : "Z → A"}
                </button>
              ))}
            </div>
          </div>

          {/* 3. INTRO STRIP */}
          <section
            className="grid grid-cols-1 md:[grid-template-columns:0.8fr_1.2fr]"
            style={{
              padding: isMobile
                ? "32px 20px"
                : "clamp(40px, 8vh, 70px) clamp(24px, 7vw, 120px) 40px",
              gap: isMobile ? "20px" : "clamp(24px, 4vw, 50px)",
              alignItems: "start",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(36px, 5vw, 72px)",
                lineHeight: 0.95,
                letterSpacing: "-0.055em",
                fontWeight: 600,
                fontFamily: '"Onest", sans-serif',
                color: "#1e1517",
              }}
            >
              Each artist carries a story.
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: "720px",
                fontSize: "clamp(15px, 1.4vw, 18px)",
                lineHeight: 1.75,
                color: "rgba(30,21,23,0.68)",
                fontFamily: '"Onest", sans-serif',
              }}
            >
              BridgeArg presents artists not as a directory, but as a living archive of process,
              material and authorship. Every profile opens a path into the creator&apos;s world: their
              gestures, textures, techniques and works available to travel.
            </p>
          </section>

          {/* 4. ARTIST ROWS */}
          <section
            style={{
              padding: isMobile
                ? "30px 20px 60px"
                : "45px clamp(24px, 7vw, 120px) clamp(80px, 14vh, 120px)",
            }}
          >
            {filteredAndSortedArtistCards.map((card, index) => {
              const isEven = index % 2 === 0;
              const isLast = index === filteredAndSortedArtistCards.length - 1;
              const orderNumber = String(index + 1).padStart(2, "0");
              const nameParts = card.artist.name.trim().split(/\s+/);
              const firstName = nameParts[0] ?? card.artist.name;
              const lastName = nameParts.slice(1).join(" ");

              const portraitEl = (
                <div
                  className={`transition-transform duration-500 ease-out group-hover:-translate-y-[10px] group-hover:rotate-[-1deg] ${
                    isEven
                      ? "md:[grid-column:1] md:[grid-row:1]"
                      : "md:[grid-column:3] md:[grid-row:1]"
                  }`}
                  style={{
                    alignSelf: "center",
                    backgroundColor: "#fcfcfc",
                    padding: "14px",
                    boxShadow: "0 14px 42px rgba(30,21,23,0.05)",
                    height: "390px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                      filter: "saturate(0.93) contrast(0.98)",
                    }}
                  >
                    <OptimizedImage
                      src={card.artist.imageUrl ?? ""}
                      alt={card.artist.name}
                      className="!h-full !w-full"
                      imageClassName={`h-full w-full object-cover ${card.artist.slug === "sara-goldman" ? "object-top" : "object-center"}`}
                      logSrcOnError
                    />
                  </div>
                </div>
              );

              const mainEl = (
                <div
                  className={
                    isEven
                      ? "md:[grid-column:3] md:[grid-row:1]"
                      : "md:[grid-column:1] md:[grid-row:1]"
                  }
                  style={{ alignSelf: "center" }}
                >
                    <p
                      style={{
                        fontSize: "12px",
                        letterSpacing: "0.16em",
                        color: "rgba(30,21,23,0.45)",
                        textTransform: "uppercase",
                        fontFamily: '"Onest", sans-serif',
                        margin: "0 0 22px 0",
                      }}
                    >
                      {orderNumber} / Artist
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "clamp(42px, 6vw, 92px)",
                        letterSpacing: "-0.06em",
                        lineHeight: 0.88,
                        fontWeight: 600,
                        fontFamily: '"Onest", sans-serif',
                        color: "#1e1517",
                      }}
                    >
                      <span style={{ display: "block" }}>{firstName}</span>
                      {lastName && (
                        <span
                          style={{
                            fontFamily: '"BestDB", "Caveat", cursive',
                            color: "#7FB2D1",
                            fontWeight: 400,
                            display: "inline-block",
                            transform: "rotate(-7deg)",
                            transformOrigin: "left center",
                          }}
                        >
                          {lastName}
                        </span>
                      )}
                    </h3>
                    <p
                      style={{
                        margin: "26px 0 0 0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "14px",
                        color: "rgba(30,21,23,0.62)",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: "42px",
                          height: "1px",
                          backgroundColor: "#7FB2D1",
                          display: "inline-block",
                        }}
                      />
                      {card.artist.discipline ?? "—"}
                    </p>
                    <p
                      style={{
                        marginTop: "34px",
                        marginBottom: 0,
                        maxWidth: "520px",
                        fontSize: "clamp(14px, 1.3vw, 17px)",
                        lineHeight: 1.7,
                        color: "rgba(30,21,23,0.66)",
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      {card.artist.statement ||
                        "Working at the crossroads of memory, material and place — pieces that travel beyond their making."}
                    </p>
                    <span
                      style={{
                        marginTop: "28px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        fontFamily: '"Onest", sans-serif',
                        color: "#1e1517",
                      }}
                    >
                      <span
                        className="border transition-all duration-200 border-[rgba(30,21,23,0.25)] text-[#1e1517] group-hover:bg-[#7FB2D1] group-hover:border-[#7FB2D1] group-hover:text-[#fcf8ea]"
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                        }}
                      >
                        →
                      </span>
                      View artist
                    </span>
                </div>
              );

              return (
                <Link
                  key={card.artist.id}
                  to={`/artistas/${card.artist.slug}`}
                  className="group max-md:!grid-template-columns-[1fr] max-md:!grid-template-rows-[auto]"
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr",
                    gridTemplateRows: "1fr",
                    alignItems: "center",
                    minHeight: isMobile ? "auto" : "420px",
                    gap: isMobile ? "24px" : "clamp(80px, 12vw, 200px)",
                    padding: isMobile ? "28px 0" : "50px 0",
                    borderTop: "1px solid rgba(30,21,23,0.16)",
                    borderBottom: isLast ? "1px solid rgba(30,21,23,0.16)" : undefined,
                    cursor: "pointer",
                    position: "relative",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {portraitEl}
                  {mainEl}
                </Link>
              );
            })}
          </section>

          {/* 5. FEATURED BANNER */}
          <section
            className="grid grid-cols-1 md:grid-cols-2"
            style={{
              margin: isMobile
                ? "0 20px 60px"
                : "0 clamp(24px, 7vw, 120px) clamp(80px, 14vh, 120px)",
              backgroundColor: "#1e1517",
              color: "#fcf8ea",
              minHeight: isMobile ? "auto" : "520px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "clamp(40px, 6vw, 70px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(38px, 6vw, 96px)",
                  lineHeight: 0.86,
                  letterSpacing: "-0.06em",
                  fontWeight: 600,
                  fontFamily: '"Onest", sans-serif',
                  color: "#fcf8ea",
                  textAlign: "left",
                }}
              >
                Objects that are history, craft, design and identity.
              </h2>
            </div>
            <div
              aria-hidden
              style={{
                backgroundImage: `url('${images.objectsHistory}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                minHeight: "520px",
              }}
            />
          </section>

          {/* 6. FOOTER CTA */}
          <section
            className="flex flex-wrap items-start md:items-end"
            style={{
              padding: isMobile
                ? "0 20px 60px"
                : "0 clamp(24px, 7vw, 120px) clamp(80px, 14vh, 110px)",
              justifyContent: "space-between",
              gap: isMobile ? "24px" : "40px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "clamp(16px, 2vw, 32px)",
              }}
            >
              <img
                src="/assets/logos/BRIDGEARG - Exportacion logos-07.svg"
                alt="BridgeArg"
                style={{
                  width: "clamp(80px, 10vw, 140px)",
                  height: "auto",
                  flexShrink: 0,
                  alignSelf: "center",
                  opacity: 0.85,
                }}
              />
              <h2
                style={{
                  margin: 0,
                  maxWidth: "760px",
                  fontSize: "clamp(38px, 7vw, 110px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.06em",
                  fontWeight: 600,
                  fontFamily: '"Onest", sans-serif',
                  color: "#1e1517",
                }}
              >
                Discover the works behind each artist.
              </h2>
            </div>
            <Link
              to="/artworks"
              style={{
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(11px, 1vw, 14px)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                color: "#1e1517",
                textDecoration: "none",
                borderBottom: "1px solid rgba(30,21,23,0.4)",
                paddingBottom: "4px",
                display: "inline-block",
                whiteSpace: "nowrap",
                transition: "color 0.3s ease, letter-spacing 0.3s ease, font-size 0.3s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.color = "#7FB2D1";
                el.style.borderBottomColor = "#7FB2D1";
                el.style.letterSpacing = "0.35em";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.color = "#1e1517";
                el.style.borderBottomColor = "rgba(30,21,23,0.4)";
                el.style.letterSpacing = "0.25em";
              }}
            >
              View the Collection
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtistasPage;
