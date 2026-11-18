import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { getArtistBySlug, getArtists, getWorks } from "@/lib/api";
import { shouldShowPrice } from "@/lib/geoPricing";
import { isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";

function getBioParagraphs(bio: string | null | undefined): string[] {
  if (!bio) return [];
  return bio
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function resolveImage(url: string | null | undefined, width: number): string {
  if (!url) return "";
  if (isSupabaseStorageObjectUrl(url)) {
    return transformUrl(url, { width, quality: 78 });
  }
  return url;
}

function isUsableArtistImage(url: string | null | undefined): url is string {
  const value = url?.trim();
  if (!value) return false;
  return !value.toLowerCase().includes("artista-ejemplo");
}

function pickStudioSource(
  studioUrl: string | null | undefined,
  profileUrl: string | null | undefined,
): string {
  if (isUsableArtistImage(studioUrl)) return studioUrl.trim();
  if (isUsableArtistImage(profileUrl)) return profileUrl.trim();
  return "";
}

const QUICK_NAV = [
  { label: "Works", href: "#works", id: "works" },
  { label: "Statement", href: "#statement", id: "statement" },
  { label: "Process", href: "#process", id: "process" },
  { label: "Details", href: "#details", id: "details" },
] as const;

const ArtistaDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeSection, setActiveSection] = useState<string>("works");
  const [processImageSrc, setProcessImageSrc] = useState("");
  const [processImageFailed, setProcessImageFailed] = useState(false);

  const {
    data: artist = null,
    isLoading: loadingArtist,
    isError: artistError,
  } = useQuery({
    queryKey: ["artist", slug],
    queryFn: () => getArtistBySlug(slug!),
    enabled: !!slug,
  });

  const { data: allArtists = [] } = useQuery({
    queryKey: ["artists"],
    queryFn: getArtists,
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

  useEffect(() => {
    const sectionIds = QUICK_NAV.map((item) => item.id);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-30% 0px -45% 0px",
        threshold: [0.08, 0.2, 0.4],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [artist?.id, works.length]);

  const artistNumber = useMemo(() => {
    if (!artist || allArtists.length === 0) return null;
    const sorted = [...allArtists].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    const index = sorted.findIndex((item) => item.id === artist.id);
    return index >= 0 ? index + 1 : null;
  }, [allArtists, artist]);

  const preferredStudioSrc = useMemo(() => {
    if (!artist) return "";
    return resolveImage(pickStudioSource(artist.studioImageUrl, artist.imageUrl), 1600);
  }, [artist]);

  const profileImageSrc = useMemo(() => {
    if (!artist || !isUsableArtistImage(artist.imageUrl)) return "";
    return resolveImage(artist.imageUrl, 1600);
  }, [artist]);

  useEffect(() => {
    setProcessImageFailed(false);
    setProcessImageSrc(preferredStudioSrc);
  }, [preferredStudioSrc, artist?.id]);

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
                className="mt-8 inline-flex items-center rounded-[var(--radius-button)] border border-[#1e1517]/20 px-6 py-3 font-display text-xs uppercase tracking-[0.12em] text-[#1e1517] transition-colors hover:bg-[#1e1517] hover:text-[#fcf8ea]"
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
  const statementTitle = artist.statement?.trim() || "Objects that hold memory, texture and origin.";
  const statementBody = bioParagraphs.length > 0 ? bioParagraphs : [];
  const showStatement = Boolean(artist.statement?.trim()) || statementBody.length > 0;
  const phrase = artist.description?.trim() || null;
  const nameParts = artist.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? artist.name;
  const lastName = nameParts.slice(1).join(" ");
  const portraitSrc = resolveImage(artist.detailImageUrl ?? artist.imageUrl, 1200);
  const showProcessImage = Boolean(processImageSrc) && !processImageFailed;
  const showWorks = works.length > 0;
  const visibleNav = QUICK_NAV.filter((item) => {
    if (item.id === "works") return showWorks;
    if (item.id === "statement") return showStatement;
    return true;
  });

  const handleProcessImageError = () => {
    if (
      processImageSrc &&
      profileImageSrc &&
      processImageSrc !== profileImageSrc
    ) {
      setProcessImageSrc(profileImageSrc);
      return;
    }
    setProcessImageFailed(true);
  };
  const metaRows = [
    artist.origin ? { label: "origin", value: artist.origin } : null,
    artist.discipline ? { label: "discipline", value: artist.discipline } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const detailCells = [
    { label: "Discipline", value: artist.discipline ?? "—" },
    { label: "Origin", value: artist.origin ?? "Argentina" },
    { label: "Shipping", value: "Available to U.S." },
    { label: "Certificate", value: "Included" },
  ];
  const artistOrderLabel =
    artistNumber != null ? `(Artist ${String(artistNumber).padStart(2, "0")})` : null;

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
        <main className="artist-detail">
          {/* 1. HERO */}
          <section className="artist-detail__hero">
            <Link to="/artistas" className="artist-detail__back">
              ← Back to Artists
            </Link>

            <div className="artist-detail__hero-grid">
              <div className="artist-detail__hero-copy">
                {artistOrderLabel ? (
                  <p className="artist-detail__eyebrow">{artistOrderLabel}</p>
                ) : null}
                <h1 className="artist-detail__name">
                  <span className="artist-detail__firstname">{firstName}</span>
                  {lastName ? <em className="artist-detail__lastname">{lastName}</em> : null}
                </h1>

                {metaRows.length > 0 ? (
                  <div className="artist-detail__meta">
                    {metaRows.map((row) => (
                      <span key={row.label} className="artist-detail__meta-item">
                        <span className="artist-detail__meta-rule" aria-hidden="true" />
                        {row.value}
                      </span>
                    ))}
                  </div>
                ) : null}

                {phrase ? <p className="artist-detail__phrase">{phrase}</p> : null}
              </div>

              {portraitSrc ? (
                <div className="artist-detail__portrait-wrap">
                  <span className="artist-detail__bracket" aria-hidden="true">
                    <svg viewBox="0 0 285 287" width="44" height="44" fill="none">
                      <path d="M0 0H285V60A227 227 0 0 0 58 287H0Z" fill="currentColor" />
                    </svg>
                  </span>
                  <div className="artist-detail__portrait">
                    <img
                      src={portraitSrc}
                      alt={`Portrait of ${artist.name}`}
                      width={520}
                      height={650}
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* 2. INDEX BAR */}
          <nav className="artist-detail__index" aria-label="Artist sections">
            <div className="artist-detail__index-pills" role="group" aria-label="On this page">
              {visibleNav.map((item) => {
                const active = activeSection === item.id;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`artist-detail__pill${active ? " is-active" : ""}`}
                    aria-current={active ? "true" : undefined}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
            <Link to="/contact" className="artist-detail__inquire-btn">
              Inquire about this artist
            </Link>
          </nav>

          {/* 3. DATA STRIP */}
          <section id="details" className="artist-detail__data">
            {detailCells.map((cell) => (
              <div key={cell.label} className="artist-detail__data-cell">
                <span className="artist-detail__data-label">{cell.label}</span>
                <strong className="artist-detail__data-value">{cell.value}</strong>
              </div>
            ))}
          </section>

          {/* 4. WORKS */}
          {showWorks ? (
            <section id="works" className="artist-detail__works">
              <div className="artist-detail__works-head">
                <div>
                  <p className="artist-detail__eyebrow">
                    ({works.length} {works.length === 1 ? "work" : "works"})
                  </p>
                  <h2 className="artist-detail__works-title">
                    <span className="artist-detail__works-title-line">Available</span>
                    <em className="artist-detail__script">works</em>
                  </h2>
                </div>
                <Link to="/artworks" className="artist-detail__outline-pill">
                  Explore the full collection →
                </Link>
              </div>

              <div className="artist-detail__masonry">
                {works.map((work, i) => {
                  const priceLabel = shouldShowPrice() ? work.priceDisplay : "Price on request";
                  const inquireTo = `/contact?subject=artwork-inquiry&artwork=${encodeURIComponent(work.title)}&artist=${encodeURIComponent(artist.name)}`;
                  return (
                    <article key={work.id} className="artist-detail__work">
                      <Link
                        to={`/artworks/${work.id}`}
                        className="artist-detail__work-media"
                        aria-label={`View ${work.title}`}
                      >
                        <OptimizedImage
                          src={work.imagenUrl ?? ""}
                          title={work.title}
                          artistName={artist.name}
                          variant="artwork"
                          layout="intrinsic"
                          className="!bg-transparent"
                          imageClassName="!static !h-auto !w-full !object-contain"
                          sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
                          priority={i < 4}
                          logSrcOnError
                        />
                      </Link>
                      <div className="artist-detail__work-meta">
                        <h3 className="artist-detail__work-title">{work.title}</h3>
                        <p className="artist-detail__work-price">{priceLabel}</p>
                        <div className="artist-detail__work-links">
                          <Link to={`/artworks/${work.id}`} className="artist-detail__text-link">
                            View work
                          </Link>
                          <Link to={inquireTo} className="artist-detail__text-link">
                            Inquire
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* 5. STATEMENT */}
          {showStatement ? (
            <section id="statement" className="artist-detail__statement">
              <div className="artist-detail__statement-copy">
                <p className="artist-detail__eyebrow">(Artist statement)</p>
                <h2 className="artist-detail__statement-title">{statementTitle}</h2>
              </div>
              <div className="artist-detail__statement-body">
                {statementBody.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <p className="artist-detail__statement-script">The material always speaks first.</p>
              </div>
            </section>
          ) : null}

          {/* 6. PROCESS */}
          <section
            id="process"
            className={`artist-detail__process${showProcessImage ? "" : " artist-detail__process--text-only"}`}
          >
            {showProcessImage ? (
              <div className="artist-detail__process-media">
                <img
                  src={processImageSrc}
                  alt={`${artist.name} in the studio`}
                  loading="lazy"
                  decoding="async"
                  onError={handleProcessImageError}
                />
              </div>
            ) : null}
            <div className="artist-detail__process-copy">
              <p className="artist-detail__eyebrow">(Process)</p>
              <h2 className="artist-detail__process-title">
                <span className="artist-detail__process-title-line">The hand behind the</span>
                <em className="artist-detail__script">piece</em>
              </h2>
              <p className="artist-detail__process-text">
                Each piece begins with long observation: the wood, the clay, the texture of the day.
                Tools stay simple, time stays generous. The studio is where intuition meets discipline,
                and where every object is shaped one decision at a time.
              </p>
              {showWorks ? (
                <a href="#works" className="artist-detail__text-link">
                  View works →
                </a>
              ) : null}
            </div>
          </section>

          {/* 7. CLOSE */}
          <section className="artist-detail__close" aria-label="Inquire">
            <div className="artist-detail__close-panel">
              <div className="artist-detail__close-copy">
                <p className="artist-detail__close-eyebrow">(Inquire)</p>
                <h2 className="artist-detail__close-title">
                  <span className="artist-detail__close-title-line">Bring this story</span>
                  <em className="artist-detail__close-script">home</em>
                </h2>
              </div>
              <div className="artist-detail__close-action">
                <p>
                  BridgeArg handles documentation, packaging and shipping so each piece can travel safely
                  across borders.
                </p>
                <Link to="/contact" className="artist-detail__inquire-btn artist-detail__inquire-btn--close">
                  Inquire about this artist →
                </Link>
              </div>
            </div>
          </section>

          <style>{`
            .artist-detail {
              --ad-ink: #1e1517;
              --ad-cream: #fcf8ea;
              --ad-sky: #7fb2d1;
              --ad-muted: #5f5659;
              --ad-line: rgba(30, 21, 23, 0.22);
              --ad-soft: #cfc6b0;
              --ad-body: #e7dfca;
              --ad-sans: "Onest", system-ui, -apple-system, "Segoe UI", sans-serif;
              --ad-script: "BestDB", "Best DB Normal", "Snell Roundhand", cursive;
              --ad-pad: 72px;
              background: var(--ad-cream);
              color: var(--ad-ink);
              overflow-x: clip;
              -webkit-font-smoothing: antialiased;
            }

            .artist-detail__works,
            .artist-detail__statement,
            .artist-detail__process,
            .artist-detail__data {
              scroll-margin-top: calc(var(--header-h, 80px) + 96px);
            }

            .artist-detail__hero {
              padding: calc(var(--header-h, 80px) + 40px) var(--ad-pad) 72px;
              background: var(--ad-cream);
            }

            .artist-detail__back {
              display: inline-flex;
              align-items: center;
              margin: 0 0 48px;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              text-decoration: none;
              color: var(--ad-muted);
              transition: color 0.2s ease;
            }

            .artist-detail__back:hover,
            .artist-detail__back:focus-visible {
              color: var(--ad-ink);
            }

            .artist-detail__back:focus-visible,
            .artist-detail__pill:focus-visible,
            .artist-detail__inquire-btn:focus-visible,
            .artist-detail__outline-pill:focus-visible,
            .artist-detail__text-link:focus-visible,
            .artist-detail__work-media:focus-visible {
              outline: 2px solid var(--ad-ink);
              outline-offset: 4px;
            }

            .artist-detail__hero-grid {
              display: grid;
              grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
              gap: 96px;
              align-items: end;
            }

            .artist-detail__eyebrow {
              margin: 0;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ad-muted);
            }

            .artist-detail__name {
              margin: 18px 0 0;
              font-size: 112px;
            }

            .artist-detail__firstname {
              display: block;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 1em;
              line-height: 0.98;
              letter-spacing: -0.03em;
              text-transform: uppercase;
              color: var(--ad-ink);
            }

            .artist-detail__lastname {
              display: block;
              margin-top: 0.05em;
              margin-left: 56px;
              font-family: var(--ad-script);
              font-style: normal;
              font-weight: 400;
              font-size: 1.4em;
              line-height: 0.9;
              letter-spacing: 0;
              text-transform: none;
              color: #1e1517;
              padding-bottom: 0.12em;
            }

            .artist-detail__meta {
              display: flex;
              flex-wrap: wrap;
              gap: 28px;
              margin-top: 36px;
            }

            .artist-detail__meta-item {
              display: inline-flex;
              align-items: center;
              gap: 14px;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ad-muted);
            }

            .artist-detail__meta-rule {
              width: 32px;
              height: 1px;
              background: var(--ad-sky);
              flex-shrink: 0;
            }

            .artist-detail__phrase {
              margin: 36px 0 0;
              max-width: 600px;
              padding-top: 28px;
              border-top: 1px solid var(--ad-ink);
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 24px;
              line-height: 1.45;
              color: var(--ad-ink);
            }

            .artist-detail__portrait-wrap {
              position: relative;
              width: 100%;
              max-width: 520px;
              justify-self: end;
            }

            .artist-detail__bracket {
              position: absolute;
              top: -14px;
              left: -14px;
              z-index: 2;
              color: var(--ad-ink);
              line-height: 0;
            }

            .artist-detail__portrait {
              width: 100%;
              aspect-ratio: 4 / 5;
              overflow: hidden;
              border-radius: 999px 999px 0 0;
              background: #efe7cf;
            }

            .artist-detail__portrait img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center 25%;
            }

            .artist-detail__index {
              position: sticky;
              top: var(--header-h, 80px);
              z-index: 20;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              min-height: 80px;
              padding: 16px var(--ad-pad);
              background: rgba(252, 248, 234, 0.9);
              backdrop-filter: blur(14px);
              -webkit-backdrop-filter: blur(14px);
              border-top: 1px solid var(--ad-line);
              border-bottom: 1px solid var(--ad-line);
            }

            .artist-detail__index-pills {
              display: flex;
              align-items: center;
              gap: 10px;
              min-width: 0;
            }

            .artist-detail__pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 40px;
              padding: 0 20px;
              border: 1px solid var(--ad-ink);
              border-radius: 9999px;
              background: transparent;
              color: var(--ad-ink);
              font-family: var(--ad-sans);
              font-size: 14px;
              font-weight: 500;
              letter-spacing: 0.04em;
              text-decoration: none;
              white-space: nowrap;
              transition: background 0.2s ease, color 0.2s ease;
            }

            .artist-detail__pill.is-active,
            .artist-detail__pill:hover {
              background: var(--ad-ink);
              color: var(--ad-cream);
            }

            .artist-detail__inquire-btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              min-height: 48px;
              padding: 0 28px;
              border-radius: 9999px;
              background: var(--ad-sky);
              color: var(--ad-ink);
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              text-decoration: none;
              transition: background 0.2s ease, color 0.2s ease;
            }

            .artist-detail__inquire-btn:hover,
            .artist-detail__inquire-btn:focus-visible {
              background: var(--ad-ink);
              color: var(--ad-cream);
            }

            .artist-detail__data {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              padding: 0 var(--ad-pad);
              border-bottom: 1px solid var(--ad-ink);
            }

            .artist-detail__data-cell {
              padding: 42px 28px 42px 0;
              border-right: 1px solid var(--ad-line);
            }

            .artist-detail__data-cell:last-child {
              border-right: 0;
              padding-right: 0;
            }

            .artist-detail__data-cell:not(:first-child) {
              padding-left: 28px;
            }

            .artist-detail__data-label {
              display: block;
              margin-bottom: 14px;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ad-muted);
            }

            .artist-detail__data-value {
              display: block;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 26px;
              line-height: 1.2;
              color: var(--ad-ink);
            }

            .artist-detail__works {
              padding: 128px var(--ad-pad) 0;
            }

            .artist-detail__works-head {
              display: flex;
              align-items: end;
              justify-content: space-between;
              gap: 32px;
              margin-bottom: 64px;
            }

            .artist-detail__works-title {
              margin: 18px 0 0;
              font-size: 72px;
            }

            .artist-detail__works-title-line {
              display: block;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 1em;
              line-height: 0.98;
              letter-spacing: -0.03em;
              text-transform: uppercase;
              color: var(--ad-ink);
            }

            .artist-detail__script {
              display: block;
              margin-top: 0.06em;
              font-family: var(--ad-script);
              font-style: normal;
              font-weight: 400;
              font-size: 1.2em;
              line-height: 0.9;
              letter-spacing: 0;
              text-transform: none;
              color: var(--ad-ink);
            }

            .artist-detail__outline-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 48px;
              padding: 0 24px;
              border: 1px solid var(--ad-ink);
              border-radius: 9999px;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              text-decoration: none;
              color: var(--ad-ink);
              white-space: nowrap;
              transition: background 0.2s ease, color 0.2s ease;
            }

            .artist-detail__outline-pill:hover,
            .artist-detail__outline-pill:focus-visible {
              background: var(--ad-ink);
              color: var(--ad-cream);
            }

            .artist-detail__masonry {
              column-count: 3;
              column-gap: 40px;
              width: 100%;
            }

            .artist-detail__work {
              break-inside: avoid;
              -webkit-column-break-inside: avoid;
              page-break-inside: avoid;
              display: inline-block;
              width: 100%;
              margin: 0 0 64px;
            }

            .artist-detail__work-media {
              display: block;
              text-decoration: none;
              color: inherit;
            }

            .artist-detail__work-media img {
              display: block;
              width: 100%;
              height: auto;
            }

            .artist-detail__work-meta {
              margin-top: 20px;
            }

            .artist-detail__work-title {
              margin: 0;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 24px;
              line-height: 1.2;
              letter-spacing: -0.02em;
              text-transform: uppercase;
              color: var(--ad-ink);
            }

            .artist-detail__work-price {
              margin: 10px 0 0;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              color: var(--ad-muted);
            }

            .artist-detail__work-links {
              display: flex;
              flex-wrap: wrap;
              gap: 24px;
              margin-top: 18px;
            }

            .artist-detail__text-link {
              display: inline-block;
              padding-bottom: 4px;
              border-bottom: 1px solid var(--ad-sky);
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              text-decoration: none;
              color: var(--ad-ink);
              transition: border-color 0.2s ease, color 0.2s ease;
            }

            .artist-detail__text-link:hover,
            .artist-detail__text-link:focus-visible {
              border-bottom-color: var(--ad-ink);
            }

            .artist-detail__statement {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 96px;
              margin-top: 96px;
              padding: 136px var(--ad-pad) 128px;
              border-top: 1px solid var(--ad-line);
            }

            .artist-detail__statement-title {
              margin: 18px 0 0;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 64px;
              line-height: 1.04;
              letter-spacing: -0.03em;
              text-transform: uppercase;
              color: var(--ad-ink);
            }

            .artist-detail__statement-body {
              max-width: 600px;
              justify-self: end;
            }

            .artist-detail__statement-body p {
              margin: 0 0 22px;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 18px;
              line-height: 1.7;
              color: var(--ad-muted);
            }

            .artist-detail__statement-script {
              margin: 36px 0 0 !important;
              font-family: var(--ad-script) !important;
              font-size: 52px !important;
              line-height: 0.95 !important;
              color: var(--ad-ink) !important;
            }

            .artist-detail__process {
              display: grid;
              grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
              gap: 96px;
              align-items: center;
              padding: 0 var(--ad-pad) 128px;
            }

            .artist-detail__process--text-only {
              grid-template-columns: 1fr;
            }

            .artist-detail__process--text-only .artist-detail__process-text {
              max-width: 720px;
            }

            .artist-detail__process-media img {
              display: block;
              width: 100%;
              height: auto;
            }

            .artist-detail__process-title {
              margin: 18px 0 0;
              font-size: 64px;
            }

            .artist-detail__process-title-line {
              display: block;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 1em;
              line-height: 1.02;
              letter-spacing: -0.03em;
              text-transform: uppercase;
              color: var(--ad-ink);
            }

            .artist-detail__process-text {
              margin: 28px 0 0;
              max-width: 520px;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 18px;
              line-height: 1.7;
              color: var(--ad-muted);
            }

            .artist-detail__process-copy .artist-detail__text-link {
              margin-top: 32px;
            }

            .artist-detail__close {
              padding: 0 28px 28px;
            }

            .artist-detail__close-panel {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 96px;
              align-items: end;
              padding: 136px 96px;
              background: var(--ad-ink);
              color: var(--ad-cream);
            }

            .artist-detail__close-eyebrow {
              margin: 0;
              font-family: var(--ad-sans);
              font-size: 12px;
              font-weight: 500;
              letter-spacing: 0.22em;
              text-transform: uppercase;
              color: var(--ad-soft);
            }

            .artist-detail__close-title {
              margin: 18px 0 0;
              font-size: 96px;
            }

            .artist-detail__close-title-line {
              display: block;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 1em;
              line-height: 0.98;
              letter-spacing: -0.03em;
              text-transform: uppercase;
              color: var(--ad-cream);
            }

            .artist-detail__close-script {
              display: block;
              margin-top: 0.06em;
              font-family: var(--ad-script);
              font-style: normal;
              font-weight: 400;
              font-size: 1.2em;
              line-height: 0.9;
              color: var(--ad-sky);
            }

            .artist-detail__close-action p {
              margin: 0 0 32px;
              max-width: 440px;
              font-family: var(--ad-sans);
              font-weight: 300;
              font-size: 18px;
              line-height: 1.7;
              color: var(--ad-body);
            }

            .artist-detail__inquire-btn--close {
              background: var(--ad-sky);
              color: var(--ad-ink);
            }

            @media (max-width: 1000px) {
              .artist-detail {
                --ad-pad: 40px;
              }

              .artist-detail__hero-grid,
              .artist-detail__statement,
              .artist-detail__process,
              .artist-detail__close-panel {
                grid-template-columns: 1fr;
                gap: 48px;
              }

              .artist-detail__name {
                font-size: 84px;
              }

              .artist-detail__lastname {
                margin-left: 28px;
              }

              .artist-detail__portrait-wrap {
                justify-self: start;
                max-width: 420px;
              }

              .artist-detail__index {
                flex-direction: column;
                align-items: stretch;
                gap: 14px;
                min-height: 0;
                padding-top: 14px;
                padding-bottom: 14px;
              }

              .artist-detail__index-pills {
                overflow-x: auto;
                scrollbar-width: none;
                -webkit-overflow-scrolling: touch;
              }

              .artist-detail__index-pills::-webkit-scrollbar {
                display: none;
              }

              .artist-detail__inquire-btn {
                width: 100%;
              }

              .artist-detail__data {
                grid-template-columns: 1fr 1fr;
              }

              .artist-detail__data-cell {
                padding: 28px 20px 28px 0;
              }

              .artist-detail__data-cell:nth-child(2n) {
                border-right: 0;
                padding-right: 0;
                padding-left: 20px;
              }

              .artist-detail__data-cell:nth-child(n + 3) {
                border-top: 1px solid var(--ad-line);
              }

              .artist-detail__works {
                padding-top: 96px;
              }

              .artist-detail__works-head {
                flex-direction: column;
                align-items: flex-start;
              }

              .artist-detail__works-title {
                font-size: 54px;
              }

              .artist-detail__statement-title {
                font-size: 48px;
              }

              .artist-detail__process-title {
                font-size: 54px;
              }

              .artist-detail__masonry {
                column-count: 2;
              }

              .artist-detail__statement {
                margin-top: 72px;
                padding: 96px var(--ad-pad);
              }

              .artist-detail__statement-body {
                justify-self: start;
              }

              .artist-detail__process {
                padding-bottom: 96px;
              }

              .artist-detail__close {
                padding: 0 16px 16px;
              }

              .artist-detail__close-panel {
                padding: 88px 48px;
              }

              .artist-detail__close-title {
                font-size: 64px;
              }
            }

            @media (max-width: 640px) {
              .artist-detail {
                --ad-pad: 20px;
              }

              .artist-detail__hero {
                padding-bottom: 48px;
              }

              .artist-detail__name {
                font-size: 56px;
              }

              .artist-detail__lastname {
                margin-left: 12px;
              }

              .artist-detail__phrase {
                font-size: 20px;
              }

              .artist-detail__portrait-wrap {
                max-width: 340px;
              }

              .artist-detail__data {
                grid-template-columns: 1fr 1fr;
              }

              .artist-detail__data-value {
                font-size: 20px;
              }

              .artist-detail__works {
                padding-top: 72px;
              }

              .artist-detail__works-title {
                font-size: 38px;
              }

              .artist-detail__masonry {
                column-count: 1;
                column-gap: 0;
              }

              .artist-detail__work {
                margin-bottom: 48px;
              }

              .artist-detail__work-title {
                font-size: 20px;
              }

              .artist-detail__statement {
                margin-top: 48px;
                padding: 72px var(--ad-pad);
              }

              .artist-detail__statement-title {
                font-size: 34px;
              }

              .artist-detail__statement-script {
                font-size: 38px !important;
              }

              .artist-detail__process-title {
                font-size: 38px;
              }

              .artist-detail__close {
                padding: 0 12px 12px;
              }

              .artist-detail__close-panel {
                padding: 64px 24px;
              }

              .artist-detail__close-title {
                font-size: 42px;
              }
            }
          `}</style>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtistaDetailPage;
