import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { getArtists, getWorks, type ArtistFromApi, type WorkFromApi } from "@/lib/api";
import { excerpt } from "@/lib/excerpt";
import { isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { images } from "@/lib/images";
import { useIsMobile } from "@/hooks/use-mobile";

function resolveArtistPortrait(url: string | null | undefined): string {
  if (!url) return "";
  if (isSupabaseStorageObjectUrl(url)) {
    return transformUrl(url, { width: 900, quality: 75 });
  }
  return url;
}

const ARTIST_CARD_FALLBACK =
  "Working at the crossroads of memory, material and place — pieces that travel beyond their making.";

type ArtistCard = {
  artist: ArtistFromApi;
  featuredWork: WorkFromApi | null;
};

const ArtistasPage = () => {
  const isMobile = useIsMobile();
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
            data-cursor-theme="dark"
            style={{
              minHeight: isMobile ? "auto" : "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "start",
              padding: isMobile
                ? "100px 20px 40px"
                : "clamp(120px, 18vh, 180px) clamp(24px, 7vw, 120px) clamp(60px, 10vh, 120px)",
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

          {/* 2–4. Filters + intro + artist index (redesign) */}
          <div className="artists-index">
            <div className="artists-index__toolbar">
              <div className="artists-index__pills" role="group" aria-label="Filter by discipline">
                {["All", ...disciplines].map((disc) => {
                  const value = disc === "All" ? "all" : disc;
                  const pressed = activeFilter === value;
                  return (
                    <button
                      key={disc}
                      type="button"
                      className="artists-index__pill"
                      aria-pressed={pressed}
                      onClick={() => setActiveFilter(value)}
                    >
                      {disc}
                    </button>
                  );
                })}
              </div>
              <div className="artists-index__meta">
                <p className="artists-index__count">
                  {filteredAndSortedArtistCards.length} artists
                </p>
                <div className="artists-index__sort">
                  <select
                    aria-label="Sort artists"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  >
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                  </select>
                </div>
              </div>
            </div>

            <section className="artists-index__intro">
              <div className="artists-index__intro-copy">
                <p className="artists-index__eyebrow">(The artists)</p>
                <h2 className="artists-index__title">
                  <span className="artists-index__title-line">Each artist carries a</span>
                  <em className="artists-index__script">story</em>
                </h2>
              </div>
              <p className="artists-index__lede">
                BridgeArg presents artists not as a directory, but as a living archive of process,
                material and authorship. Every profile opens a path into the creator&apos;s world: their
                gestures, textures, techniques and works available to travel.
              </p>
            </section>

            <section className="artists-index__grid" aria-label="Artists">
              {filteredAndSortedArtistCards.map((card, index) => {
                const orderNumber = String(index + 1).padStart(2, "0");
                const nameParts = card.artist.name.trim().split(/\s+/);
                const firstName = nameParts[0] ?? card.artist.name;
                const lastName = nameParts.slice(1).join(" ");
                const portraitSrc = resolveArtistPortrait(card.artist.imageUrl);

                return (
                  <Link
                    key={card.artist.id}
                    to={`/artistas/${card.artist.slug}`}
                    className="artists-index__card"
                  >
                    <span className="artists-index__portrait" data-cursor="photo">
                      {portraitSrc ? (
                        <img
                          src={portraitSrc}
                          alt={`Portrait of ${card.artist.name}`}
                          loading={index < 4 ? "eager" : "lazy"}
                          decoding="async"
                          width={300}
                          height={375}
                        />
                      ) : null}
                    </span>
                    <span className="artists-index__identity">
                      <span className="artists-index__label">
                        {orderNumber} / Artist
                      </span>
                      <span className="artists-index__name">
                        <span className="artists-index__firstname">{firstName}</span>
                        {lastName ? (
                          <em className="artists-index__lastname">{lastName}</em>
                        ) : null}
                      </span>
                      <span className="artists-index__discipline">
                        <span className="artists-index__rule" aria-hidden="true" />
                        {card.artist.discipline ?? "—"}
                      </span>
                    </span>
                    <span className="artists-index__copy">
                      <span className="artists-index__bio">
                        {card.artist.statement?.trim() ||
                          excerpt(card.artist.bio, 140) ||
                          ARTIST_CARD_FALLBACK}
                      </span>
                      <span className="artists-index__cta">View artist →</span>
                    </span>
                  </Link>
                );
              })}
            </section>
          </div>

          <style>{`
            .artists-index {
              --ai-ink: #1e1517;
              --ai-cream: #fcf8ea;
              --ai-sky: #7fb2d1;
              --ai-muted: #5f5659;
              --ai-line: rgba(30, 21, 23, 0.22);
              --ai-sans: "Onest", system-ui, -apple-system, "Segoe UI", sans-serif;
              --ai-script: "BestDB", "Best DB Normal", "Snell Roundhand", cursive;
              --ai-pad: 72px;

              background: var(--ai-cream);
              color: var(--ai-ink);
              overflow-x: clip;
              -webkit-font-smoothing: antialiased;
            }

            .artists-index__toolbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              flex-wrap: wrap;
              min-height: 96px;
              padding: 20px var(--ai-pad);
              border-bottom: 1px solid var(--ai-line);
              background: var(--ai-cream);
            }

            .artists-index__pills {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              min-width: 0;
            }

            .artists-index__pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 40px;
              padding: 0 20px;
              border: 1px solid var(--ai-ink);
              border-radius: 9999px;
              background: transparent;
              color: var(--ai-ink);
              font-family: var(--ai-sans);
              font-size: 14px;
              font-weight: 400;
              letter-spacing: 0;
              text-transform: none;
              cursor: pointer;
              transition: background 0.2s ease, color 0.2s ease;
            }

            .artists-index__pill:hover {
              background: rgba(30, 21, 23, 0.08);
            }

            .artists-index__pill[aria-pressed="true"] {
              background: var(--ai-ink);
              color: var(--ai-cream);
            }

            .artists-index__pill[aria-pressed="true"]:hover {
              background: var(--ai-ink);
              color: var(--ai-cream);
            }

            .artists-index__meta {
              display: flex;
              align-items: center;
              gap: 16px;
              flex-shrink: 0;
            }

            .artists-index__count {
              margin: 0;
              font-family: var(--ai-sans);
              font-weight: 500;
              font-size: 12px;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ai-muted);
              white-space: nowrap;
            }

            .artists-index__sort {
              position: relative;
              display: inline-flex;
            }

            .artists-index__sort select {
              appearance: none;
              -webkit-appearance: none;
              min-height: 40px;
              padding: 0 36px 0 20px;
              border: 1px solid var(--ai-ink);
              border-radius: 9999px;
              background: transparent;
              color: var(--ai-ink);
              font-family: var(--ai-sans);
              font-weight: 500;
              font-size: 12px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              cursor: pointer;
            }

            .artists-index__sort::after {
              content: "";
              position: absolute;
              right: 14px;
              top: 50%;
              width: 7px;
              height: 7px;
              border-right: 1.5px solid currentColor;
              border-bottom: 1.5px solid currentColor;
              transform: translateY(-60%) rotate(45deg);
              pointer-events: none;
              color: var(--ai-ink);
            }

            .artists-index__intro {
              display: grid;
              grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
              gap: 64px;
              align-items: end;
              padding: 112px var(--ai-pad) 0;
            }

            .artists-index__eyebrow {
              margin: 0;
              font-family: var(--ai-sans);
              font-weight: 500;
              font-size: 12px;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ai-muted);
            }

            .artists-index__title {
              margin: 18px 0 0;
              font-family: var(--ai-sans);
              font-weight: 300;
              font-size: clamp(40px, 4.8vw, 72px);
              line-height: 1.02;
              letter-spacing: -0.02em;
              text-transform: uppercase;
              color: var(--ai-ink);
            }

            .artists-index__title-line {
              display: block;
              white-space: nowrap;
            }

            .artists-index__script {
              display: block;
              margin-top: 0.08em;
              font-family: var(--ai-script);
              font-style: normal;
              font-weight: 400;
              font-size: 1.2em;
              letter-spacing: 0;
              text-transform: none;
              color: var(--ai-ink);
              line-height: 1;
            }

            .artists-index__lede {
              margin: 0;
              max-width: 560px;
              justify-self: end;
              font-family: var(--ai-sans);
              font-weight: 300;
              font-size: 18px;
              line-height: 1.65;
              color: var(--ai-muted);
            }

            .artists-index__grid {
              display: flex;
              flex-direction: column;
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 88px var(--ai-pad) 120px;
              box-sizing: border-box;
            }

            .artists-index__card {
              display: grid;
              grid-template-columns: 300px minmax(0, 1.1fr) minmax(0, 0.9fr);
              column-gap: 72px;
              align-items: center;
              padding: 40px 0;
              border-top: 1px solid var(--ai-ink);
              text-decoration: none;
              color: inherit;
              min-width: 0;
            }

            .artists-index__card:last-child {
              border-bottom: 1px solid var(--ai-ink);
            }

            .artists-index__card:focus-visible {
              outline: 2px solid var(--ai-ink);
              outline-offset: 6px;
            }

            .artists-index__portrait {
              display: block;
              width: 300px;
              max-width: 100%;
              aspect-ratio: 4 / 5;
              overflow: hidden;
              border-radius: 999px 999px 0 0;
              background: #efe7cf;
            }

            .artists-index__portrait img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center 20%;
              filter: none;
              transform: none;
            }

            .artists-index__identity,
            .artists-index__copy {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              min-width: 0;
            }

            .artists-index__label {
              font-family: var(--ai-sans);
              font-weight: 500;
              font-size: 11px;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ai-muted);
            }

            .artists-index__name {
              display: block;
              margin-top: 18px;
              min-width: 0;
              overflow: visible;
              font-size: 56px;
            }

            .artists-index__firstname {
              display: block;
              font-family: var(--ai-sans);
              font-weight: 300;
              font-size: 1em;
              line-height: 1.05;
              letter-spacing: -0.02em;
              text-transform: uppercase;
              color: var(--ai-ink);
              white-space: nowrap;
            }

            .artists-index__lastname {
              display: block;
              margin-top: 2px;
              padding-bottom: 0.18em;
              font-family: var(--ai-script);
              font-style: normal;
              font-weight: 400;
              font-size: 1.6em;
              line-height: 0.9;
              letter-spacing: 0;
              text-transform: none;
              color: #1e1517;
              white-space: nowrap;
            }

            .artists-index__discipline {
              display: inline-flex;
              align-items: center;
              gap: 14px;
              margin-top: 36px;
              font-family: var(--ai-sans);
              font-weight: 500;
              font-size: 12px;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              color: var(--ai-muted);
            }

            .artists-index__rule {
              width: 32px;
              height: 1px;
              background: var(--ai-sky);
              flex-shrink: 0;
            }

            .artists-index__bio {
              display: block;
              margin: 0;
              max-width: 42ch;
              font-family: var(--ai-sans);
              font-weight: 300;
              font-size: 16px;
              line-height: 1.6;
              color: var(--ai-muted);
            }

            .artists-index__cta {
              display: inline-block;
              margin-top: 28px;
              padding-bottom: 5px;
              border-bottom: 1px solid var(--ai-sky);
              font-family: var(--ai-sans);
              font-weight: 500;
              font-size: 12px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: var(--ai-ink);
              transition: border-color 0.2s ease;
            }

            .artists-index__card:hover .artists-index__cta,
            .artists-index__card:focus-visible .artists-index__cta {
              border-bottom-color: var(--ai-ink);
            }

            /* 2-col cards before 3-col middle track gets too narrow for script surnames */
            @media (max-width: 1200px) {
              .artists-index__card {
                grid-template-columns: 220px minmax(0, 1fr);
                column-gap: 40px;
                align-items: start;
              }

              .artists-index__portrait {
                width: 220px;
              }

              .artists-index__copy {
                grid-column: 2;
              }
            }

            @media (max-width: 1000px) {
              .artists-index {
                --ai-pad: 40px;
              }

              .artists-index__intro {
                grid-template-columns: 1fr;
                align-items: start;
                gap: 28px;
                padding-top: 80px;
              }

              .artists-index__lede {
                justify-self: start;
              }

              .artists-index__title {
                font-size: 54px;
              }

              .artists-index__title-line {
                white-space: normal;
              }

              .artists-index__grid {
                padding-top: 64px;
                padding-bottom: 96px;
              }

              .artists-index__name {
                font-size: 44px;
              }

              .artists-index__firstname {
                white-space: normal;
              }
            }

            @media (max-width: 768px) {
              .artists-index__toolbar {
                flex-direction: column;
                align-items: stretch;
                min-height: 0;
                gap: 16px;
              }

              .artists-index__pills {
                flex-wrap: nowrap;
                overflow-x: auto;
                scrollbar-width: none;
                -webkit-overflow-scrolling: touch;
                padding-bottom: 2px;
              }

              .artists-index__pills::-webkit-scrollbar {
                display: none;
              }

              .artists-index__pill {
                flex: 0 0 auto;
              }

              .artists-index__meta {
                justify-content: space-between;
                width: 100%;
              }
            }

            @media (max-width: 640px) {
              .artists-index {
                --ai-pad: 20px;
              }

              .artists-index__intro {
                padding-top: 64px;
              }

              .artists-index__title {
                font-size: 38px;
              }

              .artists-index__grid {
                padding-bottom: 72px;
              }

              .artists-index__card {
                grid-template-columns: 1fr;
                row-gap: 28px;
                align-items: start;
              }

              .artists-index__portrait {
                width: 100%;
                max-width: 340px;
              }

              .artists-index__copy {
                grid-column: auto;
              }

              .artists-index__name {
                font-size: 30px;
              }
            }
          `}</style>

          {/* 5. FEATURED BANNER */}
          <section
            className="grid grid-cols-1 md:grid-cols-2"
            data-cursor-theme="dark"
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
