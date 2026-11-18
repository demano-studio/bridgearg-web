import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getWorks, getWorksTotalCount, type WorkFromApi } from "@/lib/api";
import { getWorkImageUrl } from "@/lib/work-images";
import { buildSrcSet, isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";

type FeaturedWork = {
  id: number;
  title: string;
  artistName: string;
  fallbackSrc: string;
};

/** Curated “one work from each artist” set from the home maqueta. */
const FEATURED: FeaturedWork[] = [
  { id: 11, title: "The Wind", artistName: "Hora French", fallbackSrc: "/assets/home-collection/11.jpg" },
  { id: 42, title: "Reposo en Flúor", artistName: "Fabio Egea", fallbackSrc: "/assets/home-collection/42.jpg" },
  { id: 22, title: "Pirueta", artistName: "Tulio Romano", fallbackSrc: "/assets/home-collection/22.jpg" },
  { id: 64, title: "El Pulso del Sur", artistName: "Carolina Caeiro", fallbackSrc: "/assets/home-collection/64.jpg" },
  { id: 81, title: "Días de Murga", artistName: "Boyo Quintana", fallbackSrc: "/assets/home-collection/81.jpg" },
  { id: 39, title: "Serie Acrobatas", artistName: "Roger Mantegani", fallbackSrc: "/assets/home-collection/39.jpg" },
  { id: 58, title: "Gacela en Amarillo", artistName: "Mariano Castañeda", fallbackSrc: "/assets/home-collection/58.jpg" },
  { id: 24, title: "Mambru", artistName: "Alejandra Espinosa", fallbackSrc: "/assets/home-collection/24.jpg" },
  { id: 77, title: "Burbujas", artistName: "Sara Goldman", fallbackSrc: "/assets/home-collection/77.jpg" },
  { id: 88, title: "No Title I", artistName: "José Benito", fallbackSrc: "/assets/home-collection/88.jpg" },
];

type DisplayWork = FeaturedWork & { imagenUrl: string };

function resolveWorkImage(imagenUrl: string): { src: string; srcSet?: string } {
  const resolved =
    imagenUrl.startsWith("/assets/") || imagenUrl.startsWith("http")
      ? imagenUrl.startsWith("/assets/")
        ? imagenUrl
        : getWorkImageUrl(imagenUrl)
      : getWorkImageUrl(imagenUrl);

  if (isSupabaseStorageObjectUrl(resolved)) {
    return {
      src: transformUrl(resolved, { width: 1200, quality: 75 }),
      srcSet: buildSrcSet(resolved, [640, 960, 1200, 1600]),
    };
  }
  return { src: resolved };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function CollectionSection() {
  const [works, setWorks] = useState<DisplayWork[]>(
    FEATURED.map((w) => ({ ...w, imagenUrl: w.fallbackSrc })),
  );
  const [totalCount, setTotalCount] = useState<number | null>(91);
  const [artistTotal, setArtistTotal] = useState<number>(FEATURED.length);

  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastRangeRef = useRef({ start: 1, end: Math.min(6, FEATURED.length) });
  const [range, setRange] = useState({ start: 1, end: Math.min(6, FEATURED.length) });

  useEffect(() => {
    let cancelled = false;

    Promise.all([getWorks(), getWorksTotalCount()])
      .then(([allWorks, count]) => {
        if (cancelled) return;
        const byId = new Map<number, WorkFromApi>(allWorks.map((w) => [w.id, w]));
        setWorks(
          FEATURED.map((featured) => {
            const live = byId.get(featured.id);
            return {
              ...featured,
              title: live?.title?.trim() || featured.title,
              artistName: live?.artistName?.trim() || featured.artistName,
              imagenUrl: live?.imagenUrl || featured.fallbackSrc,
            };
          }),
        );
        if (count != null && count > 0) setTotalCount(count);

        const unique = new Set(
          allWorks
            .map((w) => w.artistName?.trim())
            .filter((name): name is string => Boolean(name)),
        );
        if (unique.size > 0) setArtistTotal(unique.size);
      })
      .catch(() => {
        /* keep curated fallbacks */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyScrollProgress = useCallback(() => {
    rafRef.current = null;
    const el = stripRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const p = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollLeft / maxScroll)) : 0;
    // Fill bar left→right via scaleX only (min 0.06 so it never vanishes at start).
    thumb.style.transform = `scaleX(${Math.max(0.06, p)})`;

    const figures = el.querySelectorAll<HTMLElement>("[data-work-index]");
    const total = figures.length;
    if (total === 0) return;

    const itemW = figures[0].getBoundingClientRect().width || 1;
    const visibles = Math.max(1, Math.min(total, Math.round(el.clientWidth / itemW)));
    const start = Math.min(total, Math.round(p * Math.max(0, total - visibles)) + 1);
    const end = Math.min(total, start + visibles - 1);

    if (start !== lastRangeRef.current.start || end !== lastRangeRef.current.end) {
      lastRangeRef.current = { start, end };
      setRange({ start, end });
    }
  }, []);

  const scheduleScrollProgress = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(applyScrollProgress);
  }, [applyScrollProgress]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    applyScrollProgress();
    el.addEventListener("scroll", scheduleScrollProgress, { passive: true });
    window.addEventListener("resize", scheduleScrollProgress);
    return () => {
      el.removeEventListener("scroll", scheduleScrollProgress);
      window.removeEventListener("resize", scheduleScrollProgress);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [applyScrollProgress, scheduleScrollProgress, works]);

  const scrollByWorks = (dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    const fig = el.querySelector<HTMLElement>("[data-work-index]");
    const step = fig ? fig.getBoundingClientRect().width * 2 : el.clientWidth * 0.6;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const viewAllLabel =
    totalCount != null ? `View all ${totalCount} works →` : "View all works →";
  const moreArtists = Math.max(0, artistTotal - works.length);

  return (
    <section
      id="collection"
      className="home-collection-section"
      style={{ scrollMarginTop: "calc(var(--header-h, 80px) + 16px)" }}
    >
      <div className="home-collection-section__wrap">
        <div className="home-collection-section__head">
          <div className="home-collection-section__copy">
            <p className="home-collection-section__eyebrow">(From the collection)</p>
            <h2 className="home-collection-section__title">
              One work from each{" "}
              <em className="home-collection-section__script">artist</em>
            </h2>
            <p className="home-collection-section__lede">
              Painting, sculpture, drawing and hand embroidery. Every piece is original and travels
              with its certificate of authenticity.
            </p>
          </div>

          <div className="home-collection-section__actions">
            <div className="home-collection-section__arrows">
              <button
                type="button"
                data-no-pill
                className="home-collection-section__arrow"
                aria-label="Previous works"
                onClick={() => scrollByWorks(-1)}
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                data-no-pill
                className="home-collection-section__arrow home-collection-section__arrow--next"
                aria-label="Next works"
                onClick={() => scrollByWorks(1)}
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <Link to="/artworks" className="home-collection-section__view-all">
              {viewAllLabel}
            </Link>
          </div>
        </div>
      </div>

      <div
        ref={stripRef}
        className="home-collection-section__strip"
        role="list"
        aria-label="One work from each artist"
      >
        {works.map((work, index) => {
          const { src, srcSet } = resolveWorkImage(work.imagenUrl);
          return (
            <figure
              key={work.id}
              className="home-collection-section__figure"
              role="listitem"
              data-work-index={index}
            >
              <Link
                to={`/artworks/${work.id}`}
                className="home-collection-section__media"
                aria-label={`${work.title} by ${work.artistName}`}
              >
                <img
                  src={src}
                  srcSet={srcSet}
                  sizes="(max-width: 560px) 70vw, 440px"
                  alt={`${work.title} – ${work.artistName}`}
                  className="home-collection-section__img"
                  loading={index < 4 ? "eager" : "lazy"}
                  decoding="async"
                />
              </Link>
              <figcaption className="home-collection-section__meta">
                <Link to={`/artworks/${work.id}`} className="home-collection-section__artist">
                  {work.artistName}
                </Link>
                <Link to={`/artworks/${work.id}`} className="home-collection-section__work-title">
                  {work.title}
                </Link>
                <Link to={`/artworks/${work.id}`} className="home-collection-section__view-work">
                  View work
                </Link>
              </figcaption>
            </figure>
          );
        })}

        {moreArtists > 0 && (
          <div className="home-collection-section__more" role="listitem" aria-hidden="true">
            <p className="home-collection-section__more-text">
              and {moreArtists} more artist{moreArtists === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>

      <div className="home-collection-section__wrap">
        <div className="home-collection-section__progress" aria-hidden="true">
          <span className="home-collection-section__progress-range">
            {pad2(range.start)} — {pad2(range.end)}
          </span>
          <div className="home-collection-section__progress-track">
            <div ref={thumbRef} className="home-collection-section__progress-thumb" />
          </div>
          <span className="home-collection-section__progress-count">
            {artistTotal} artists
          </span>
        </div>
      </div>

      <style>{`
        .home-collection-section {
          --hc-ink: #1e1517;
          --hc-cream: #fcf8ea;
          --hc-sky: #7fb2d1;
          --hc-muted: #5f5659;
          --hc-track: #cfc6b0;
          --hc-sans: "Onest", system-ui, -apple-system, "Segoe UI", sans-serif;
          --hc-script: "BestDB", "Best DB Normal", "Snell Roundhand", cursive;
          --hc-page-pad: 72px;
          --hc-fig-pad: 36px;
          --h: 440px;

          background: var(--hc-cream);
          color: var(--hc-ink);
          padding-block: 120px;
          padding-bottom: max(120px, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));
          overflow-x: clip;
          -webkit-font-smoothing: antialiased;
        }

        .home-collection-section__wrap {
          width: 100%;
          max-width: none;
          margin: 0;
          padding-left: var(--hc-page-pad);
          padding-right: var(--hc-page-pad);
          box-sizing: border-box;
        }

        .home-collection-section__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 72px;
        }

        .home-collection-section__copy {
          min-width: 0;
          flex: 1 1 auto;
        }

        .home-collection-section__eyebrow {
          margin: 0;
          font-family: var(--hc-sans);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--hc-muted);
        }

        .home-collection-section__title {
          margin: 16px 0 0;
          font-family: var(--hc-sans);
          font-weight: 300;
          font-size: 56px;
          line-height: 1.02;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: var(--hc-ink);
          text-wrap: balance;
        }

        .home-collection-section__script {
          font-family: var(--hc-script);
          font-style: normal;
          font-weight: 400;
          font-size: 1.25em;
          letter-spacing: 0;
          text-transform: none;
          color: var(--hc-ink);
        }

        .home-collection-section__lede {
          margin: 18px 0 0;
          max-width: 460px;
          font-family: var(--hc-sans);
          font-weight: 300;
          font-size: 16px;
          line-height: 1.6;
          color: var(--hc-muted);
        }

        .home-collection-section__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 18px;
          flex-shrink: 0;
        }

        .home-collection-section__arrows {
          display: flex;
          gap: 10px;
        }

        .home-collection-section__arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          margin: 0;
          padding: 0;
          border: 1px solid var(--hc-ink);
          border-radius: 9999px;
          background: transparent;
          color: var(--hc-ink);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
        }

        .home-collection-section__arrow:hover {
          background: var(--hc-ink);
          color: var(--hc-cream);
        }

        .home-collection-section__arrow:focus-visible {
          outline: 2px solid var(--hc-sky);
          outline-offset: 3px;
        }

        .home-collection-section__arrow--next {
          background: var(--hc-sky);
          border-color: var(--hc-sky);
          color: var(--hc-ink);
        }

        .home-collection-section__arrow--next:hover {
          background: var(--hc-ink);
          border-color: var(--hc-ink);
          color: var(--hc-cream);
        }

        .home-collection-section__view-all {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 28px;
          border-radius: 9999px;
          background: var(--hc-sky);
          color: var(--hc-ink);
          font-family: var(--hc-sans);
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.25s ease, color 0.25s ease;
        }

        .home-collection-section__view-all:hover {
          background: var(--hc-ink);
          color: var(--hc-cream);
        }

        .home-collection-section__view-all:focus-visible {
          outline: 2px solid var(--hc-ink);
          outline-offset: 3px;
        }

        .home-collection-section__strip {
          display: flex;
          align-items: flex-end;
          gap: 0;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-left: calc(var(--hc-page-pad) - var(--hc-fig-pad));
          padding-right: calc(var(--hc-page-pad) - var(--hc-fig-pad));
          margin-bottom: 40px;
        }

        @media (hover: none) and (pointer: coarse) {
          .home-collection-section__strip {
            scroll-snap-type: none;
          }
        }

        .home-collection-section__strip::-webkit-scrollbar {
          display: none;
        }

        .home-collection-section__figure {
          flex: 0 0 auto;
          margin: 0;
          padding: 0 var(--hc-fig-pad);
          scroll-snap-align: start;
          max-width: none;
        }

        .home-collection-section__media {
          display: block;
          width: fit-content;
          max-width: none;
          border-bottom: 1px solid var(--hc-ink);
          text-decoration: none;
          color: inherit;
          line-height: 0;
        }

        .home-collection-section__media:focus-visible {
          outline: 2px solid var(--hc-sky);
          outline-offset: 4px;
        }

        .home-collection-section__img {
          display: block;
          height: var(--h);
          width: auto;
          max-width: none;
          object-fit: initial;
        }

        .home-collection-section__meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          padding-top: 18px;
          max-width: min(100%, 360px);
        }

        .home-collection-section__artist {
          font-family: var(--hc-sans);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--hc-muted);
        }

        .home-collection-section__artist:focus-visible,
        .home-collection-section__work-title:focus-visible,
        .home-collection-section__view-work:focus-visible {
          outline: 2px solid var(--hc-sky);
          outline-offset: 3px;
        }

        .home-collection-section__work-title {
          font-family: var(--hc-sans);
          font-weight: 300;
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: -0.01em;
          text-decoration: none;
          color: var(--hc-ink);
        }

        .home-collection-section__view-work {
          font-family: var(--hc-sans);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: underline;
          text-decoration-color: var(--hc-sky);
          text-decoration-thickness: 1px;
          text-underline-offset: 5px;
          color: var(--hc-ink);
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.25s ease, transform 0.25s ease;
          pointer-events: none;
        }

        .home-collection-section__figure:hover .home-collection-section__view-work,
        .home-collection-section__figure:focus-within .home-collection-section__view-work {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .home-collection-section__more {
          flex: 0 0 auto;
          display: flex;
          align-items: flex-end;
          min-height: var(--h);
          padding: 0 var(--hc-fig-pad) 56px;
          scroll-snap-align: start;
        }

        .home-collection-section__more-text {
          margin: 0;
          font-family: var(--hc-script);
          font-size: 44px;
          line-height: 1.1;
          color: var(--hc-muted);
          white-space: nowrap;
        }

        .home-collection-section__progress {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .home-collection-section__progress-range,
        .home-collection-section__progress-count {
          flex-shrink: 0;
          font-family: var(--hc-sans);
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--hc-muted);
          white-space: nowrap;
        }

        .home-collection-section__progress-track {
          position: relative;
          flex: 1 1 auto;
          height: 1px;
          background: var(--hc-track);
          min-width: 48px;
        }

        .home-collection-section__progress-thumb {
          position: absolute;
          left: 0;
          top: calc(50% - 1.5px);
          width: 100%;
          height: 3px;
          background: var(--hc-sky);
          transform: scaleX(0.06);
          transform-origin: left center;
          will-change: transform;
          transition: transform 120ms linear;
        }

        @media (prefers-reduced-motion: reduce) {
          .home-collection-section__progress-thumb {
            transition: none;
          }
        }

        @media (max-width: 1000px) {
          .home-collection-section {
            --hc-page-pad: 48px;
            --h: 380px;
            padding-block: 96px;
            padding-bottom: max(96px, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));
          }

          .home-collection-section__title {
            font-size: 44px;
          }

          .home-collection-section__head {
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 56px;
          }

          .home-collection-section__actions {
            align-items: flex-start;
          }
        }

        @media (max-width: 560px) {
          .home-collection-section {
            --hc-page-pad: 24px;
            --hc-fig-pad: 16px;
            --h: 300px;
            padding-block: 72px;
            padding-bottom: max(72px, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));
          }

          .home-collection-section__title {
            font-size: 34px;
          }

          .home-collection-section__work-title {
            font-size: 19px;
          }

          .home-collection-section__view-work {
            opacity: 1;
            transform: none;
            pointer-events: auto;
          }

          .home-collection-section__more-text {
            font-size: 36px;
          }

          .home-collection-section__progress {
            gap: 12px;
          }

          .home-collection-section__strip {
            scroll-snap-type: none;
          }

          .home-collection-section__head {
            margin-bottom: 48px;
          }
        }
      `}</style>
    </section>
  );
}
