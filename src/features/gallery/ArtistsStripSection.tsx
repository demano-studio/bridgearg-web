import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArtists, type ArtistFromApi } from "@/lib/api";
import { isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";

type StripArtist = {
  name: string;
  slug: string;
  discipline: string;
  fallbackSrc: string;
  imageUrl: string;
};

/** Curated order and copy from the home maqueta. */
const FEATURED: Omit<StripArtist, "imageUrl">[] = [
  { name: "Alejandra Espinosa", slug: "ale-espinosa", discipline: "Mixed media", fallbackSrc: "/assets/home-artists/espinosa.jpg" },
  { name: "Boyo Quintana", slug: "boyo-quintana", discipline: "Sculpture", fallbackSrc: "/assets/home-artists/quintana.jpg" },
  { name: "Carolina Caeiro", slug: "caro-caeiro", discipline: "Embroidery", fallbackSrc: "/assets/home-artists/caeiro.jpg" },
  { name: "Fabio Egea", slug: "fabio-egea", discipline: "Painting", fallbackSrc: "/assets/home-artists/egea.jpg" },
  { name: "Hora French", slug: "hora-french", discipline: "Painting", fallbackSrc: "/assets/home-artists/french.jpg" },
  { name: "José Benito", slug: "jose-benito", discipline: "Mixed media", fallbackSrc: "/assets/home-artists/benito.jpg" },
  { name: "Mariano Castañeda", slug: "mariano-castaneda", discipline: "Mixed media", fallbackSrc: "/assets/home-artists/castaneda.jpg" },
  { name: "Roger Mantegani", slug: "roger-mantegani", discipline: "Painting", fallbackSrc: "/assets/home-artists/mantegani.jpg" },
  { name: "Sara Goldman", slug: "sara-goldman", discipline: "Sculpture", fallbackSrc: "/assets/home-artists/goldman.jpg" },
  { name: "Tulio Romano", slug: "tulio-romano", discipline: "Sculpture", fallbackSrc: "/assets/home-artists/romano.jpg" },
];

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveArtistImage(url: string): string {
  if (!url || url.startsWith("/assets/")) return url;
  if (isSupabaseStorageObjectUrl(url)) {
    return transformUrl(url, { width: 600, quality: 75 });
  }
  return url;
}

export function ArtistsStripSection() {
  const [artists, setArtists] = useState<StripArtist[]>(
    FEATURED.map((a) => ({ ...a, imageUrl: a.fallbackSrc })),
  );

  useEffect(() => {
    let cancelled = false;

    getArtists()
      .then((live) => {
        if (cancelled) return;
        const byNorm = new Map<string, ArtistFromApi>();
        for (const artist of live) {
          byNorm.set(normalizeName(artist.name), artist);
        }
        setArtists(
          FEATURED.map((featured) => {
            const match = byNorm.get(normalizeName(featured.name));
            return {
              ...featured,
              slug: match?.slug || featured.slug,
              discipline: match?.discipline?.trim() || featured.discipline,
              imageUrl: match?.imageUrl || featured.fallbackSrc,
            };
          }),
        );
      })
      .catch(() => {
        /* keep curated fallbacks */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const leftCol = artists.slice(0, 5);
  const rightCol = artists.slice(5, 10);
  const artistCount = artists.length;

  const renderColumn = (column: StripArtist[], key: string) => (
    <ul key={key} className="artists-strip-section__col">
      {column.map((artist) => (
        <li key={artist.slug} className="artists-strip-section__item">
          <Link to={`/artists/${artist.slug}`} className="artists-strip-section__row">
            <span className="artists-strip-section__portrait">
              <img
                src={resolveArtistImage(artist.imageUrl)}
                alt={`Portrait of ${artist.name}`}
                loading="lazy"
                decoding="async"
                width={132}
                height={176}
              />
            </span>
            <span className="artists-strip-section__text">
              <span className="artists-strip-section__name">{artist.name}</span>
              <span className="artists-strip-section__discipline">{artist.discipline}</span>
            </span>
            <span className="artists-strip-section__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      id="artists"
      className="artists-strip-section"
      style={{ scrollMarginTop: "calc(var(--header-h, 80px) + 16px)" }}
    >
      <div className="artists-strip-section__wrap">
        <div className="artists-strip-section__head">
          <div className="artists-strip-section__copy">
            <p className="artists-strip-section__eyebrow">(Curated Argentine talent)</p>
            <h2 className="artists-strip-section__title">
              Artists who cross{" "}
              <em className="artists-strip-section__script">bridges</em>
            </h2>
            <p className="artists-strip-section__lede">
              {artistCount} voices from Argentina, each with a studio, a practice and a body of work
              you can follow from here.
            </p>
          </div>
          <Link to="/artists" className="artists-strip-section__cta">
            Meet the artists →
          </Link>
        </div>

        <div className="artists-strip-section__list" aria-label="Artists">
          {renderColumn(leftCol, "left")}
          {rightCol.length > 0 ? renderColumn(rightCol, "right") : null}
        </div>
      </div>

      <style>{`
        .artists-strip-section {
          --as-ink: #1e1517;
          --as-cream: #fcf8ea;
          --as-sky: #7fb2d1;
          --as-muted: #5f5659;
          --as-rule: #cfc6b0;
          --as-sans: "Onest", system-ui, -apple-system, "Segoe UI", sans-serif;
          --as-script: "BestDB", "Best DB Normal", "Snell Roundhand", cursive;
          --as-page-pad: clamp(24px, 6vw, 96px);
          --as-photo-w: 132px;
          --as-photo-h: 176px;
          --as-gap-photo: 36px;
          --as-arrow: 44px;
          --as-col-gap: clamp(48px, 6vw, 120px);

          background: var(--as-cream);
          color: var(--as-ink);
          padding-block: 120px;
          padding-bottom: max(120px, calc(env(safe-area-inset-bottom, 0px) + 4rem));
          overflow-x: clip;
          -webkit-font-smoothing: antialiased;
        }

        .artists-strip-section__wrap {
          width: 100%;
          max-width: none;
          margin: 0;
          padding-inline: var(--as-page-pad);
          box-sizing: border-box;
        }

        .artists-strip-section__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 80px;
        }

        .artists-strip-section__copy {
          min-width: 0;
          flex: 1 1 auto;
        }

        .artists-strip-section__eyebrow {
          margin: 0;
          font-family: var(--as-sans);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--as-muted);
        }

        .artists-strip-section__title {
          margin: 16px 0 0;
          font-family: var(--as-sans);
          font-weight: 300;
          font-size: 56px;
          line-height: 1.02;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: var(--as-ink);
          text-wrap: balance;
        }

        .artists-strip-section__script {
          font-family: var(--as-script);
          font-style: normal;
          font-weight: 400;
          font-size: 1.25em;
          letter-spacing: 0;
          text-transform: none;
          color: var(--as-ink);
        }

        .artists-strip-section__lede {
          margin: 18px 0 0;
          max-width: 480px;
          font-family: var(--as-sans);
          font-weight: 300;
          font-size: 16px;
          line-height: 1.6;
          color: var(--as-muted);
        }

        .artists-strip-section__cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          min-height: 48px;
          padding: 0 28px;
          border-radius: 9999px;
          background: var(--as-sky);
          color: var(--as-ink);
          font-family: var(--as-sans);
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.25s ease, color 0.25s ease;
        }

        .artists-strip-section__cta:hover {
          background: var(--as-ink);
          color: var(--as-cream);
        }

        .artists-strip-section__cta:focus-visible {
          outline: 2px solid var(--as-ink);
          outline-offset: 4px;
        }

        .artists-strip-section__list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: var(--as-col-gap);
          align-items: start;
          width: 100%;
        }

        .artists-strip-section__col {
          list-style: none;
          margin: 0;
          padding: 0;
          border-top: 1px solid var(--as-ink);
        }

        .artists-strip-section__item {
          margin: 0;
          padding: 0;
          border-bottom: 1px solid var(--as-rule);
        }

        .artists-strip-section__item:last-child {
          border-bottom: 1px solid var(--as-ink);
        }

        .artists-strip-section__row {
          display: grid;
          grid-template-columns: var(--as-photo-w) minmax(0, 1fr) var(--as-arrow);
          align-items: center;
          column-gap: var(--as-gap-photo);
          padding: 24px 0;
          text-decoration: none;
          color: inherit;
        }

        .artists-strip-section__row:focus-visible {
          outline: 2px solid var(--as-ink);
          outline-offset: 4px;
        }

        .artists-strip-section__portrait {
          display: block;
          width: var(--as-photo-w);
          height: var(--as-photo-h);
          overflow: hidden;
          border-radius: 999px 999px 0 0;
          background: #efe7cf;
        }

        .artists-strip-section__portrait img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 20%;
          filter: none;
          transform: none;
        }

        .artists-strip-section__text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .artists-strip-section__name {
          font-family: var(--as-sans);
          font-weight: 300;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--as-ink);
          white-space: nowrap;
        }

        .artists-strip-section__discipline {
          margin-top: 10px;
          font-family: var(--as-sans);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--as-muted);
        }

        .artists-strip-section__arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: var(--as-arrow);
          height: var(--as-arrow);
          border: 1px solid var(--as-ink);
          border-radius: 9999px;
          font-size: 16px;
          line-height: 1;
          color: var(--as-ink);
          transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
          justify-self: end;
        }

        .artists-strip-section__row:hover .artists-strip-section__arrow,
        .artists-strip-section__row:focus-visible .artists-strip-section__arrow {
          background: var(--as-sky);
          border-color: var(--as-sky);
          color: var(--as-ink);
        }

        @media (max-width: 1000px) {
          .artists-strip-section {
            --as-photo-w: 108px;
            --as-photo-h: 144px;
            --as-gap-photo: 28px;
            --as-arrow: 40px;
            padding-block: 96px;
            padding-bottom: max(96px, calc(env(safe-area-inset-bottom, 0px) + 4rem));
          }

          .artists-strip-section__title {
            font-size: 44px;
          }

          .artists-strip-section__name {
            font-size: 24px;
          }

          .artists-strip-section__head {
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 64px;
          }
        }

        @media (max-width: 700px) {
          .artists-strip-section__list {
            grid-template-columns: 1fr;
            row-gap: 0;
          }

          .artists-strip-section__list .artists-strip-section__col + .artists-strip-section__col {
            border-top: 0;
          }

          .artists-strip-section__list .artists-strip-section__col:first-child .artists-strip-section__item:last-child {
            border-bottom: 1px solid var(--as-rule);
          }
        }

        @media (max-width: 560px) {
          .artists-strip-section {
            --as-photo-w: 96px;
            --as-photo-h: 128px;
            --as-gap-photo: 20px;
            --as-arrow: 40px;
            padding-block: 72px;
            padding-bottom: max(72px, calc(env(safe-area-inset-bottom, 0px) + 4rem));
          }

          .artists-strip-section__title {
            font-size: 34px;
          }

          .artists-strip-section__name {
            font-size: 22px;
            white-space: normal;
          }

          .artists-strip-section__head {
            margin-bottom: 48px;
          }

          .artists-strip-section__cta {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
