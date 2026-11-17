import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArtists, type ArtistFromApi } from "@/lib/api";

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

export function ArtistsStripSection() {
  const [artists, setArtists] = useState<StripArtist[]>(
    FEATURED.map((a) => ({ ...a, imageUrl: a.fallbackSrc }))
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
          })
        );
      })
      .catch(() => {
        /* keep curated fallbacks */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="artists"
      className="artists-strip-section bg-background px-6 md:px-12 lg:px-24"
      style={{ scrollMarginTop: "calc(var(--header-h, 80px) + 16px)" }}
    >
      <div className="artists-strip-section__wrap mx-auto max-w-[1800px]">
        <div className="artists-strip-section__head">
          <div>
            <p className="artists-strip-section__eyebrow">Curated Argentine talent</p>
            <h2 className="artists-strip-section__title">Artists who cross bridges</h2>
          </div>
          <Link to="/artists" className="artists-strip-section__cta">
            Meet the artists →
          </Link>
        </div>

        <div className="artists-strip-section__strip">
          {artists.map((artist) => (
            <Link
              key={artist.slug}
              to={`/artists/${artist.slug}`}
              className="artists-strip-section__artist"
            >
              <div className="artists-strip-section__portrait">
                <img src={artist.imageUrl} alt={artist.name} loading="lazy" decoding="async" />
              </div>
              <h3 className="artists-strip-section__name">{artist.name}</h3>
              <p className="artists-strip-section__discipline">{artist.discipline}</p>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .artists-strip-section {
          padding-block: clamp(64px, 9vw, 128px);
          padding-bottom: max(clamp(64px, 9vw, 128px), calc(env(safe-area-inset-bottom, 0px) + 4rem));
        }
        .artists-strip-section__wrap {
          width: 100%;
        }
        .artists-strip-section__head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: clamp(32px, 4vw, 56px);
        }
        .artists-strip-section__eyebrow {
          margin: 0;
          font-family: "Onest", sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 400;
          color: #1e1517;
        }
        .artists-strip-section__title {
          margin: 14px 0 0;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: clamp(32px, 4vw, 60px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #1e1517;
          text-wrap: balance;
        }
        .artists-strip-section__cta {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 10px 0;
          font-family: "Onest", sans-serif;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          color: #1e1517;
          border-bottom: 1px solid currentColor;
          white-space: nowrap;
        }
        .artists-strip-section__cta:hover {
          color: #4a7fa0;
        }
        .artists-strip-section__strip {
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          gap: clamp(10px, 1.2vw, 18px);
        }
        .artists-strip-section__artist {
          text-decoration: none;
          display: block;
          min-width: 0;
          color: inherit;
        }
        .artists-strip-section__portrait {
          aspect-ratio: 3 / 4;
          overflow: hidden;
          border-radius: 999px 999px 0 0;
          background: #e6dfd0;
        }
        .artists-strip-section__portrait img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(1);
          transition: filter 0.5s, transform 1s;
          display: block;
        }
        .artists-strip-section__artist:hover img {
          filter: grayscale(0);
          transform: scale(1.04);
        }
        .artists-strip-section__name {
          font-family: "Onest", sans-serif;
          font-size: 13px;
          font-weight: 400;
          margin: 10px 0 0;
          letter-spacing: 0;
          line-height: 1.3;
          color: #1e1517;
        }
        .artists-strip-section__discipline {
          margin: 2px 0 0;
          font-family: "Onest", sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: #6b6365;
          line-height: 1.35;
        }
        @media (hover: none) {
          .artists-strip-section__portrait img {
            filter: none;
          }
        }
        @media (max-width: 1100px) {
          .artists-strip-section__strip {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            row-gap: 28px;
          }
        }
        @media (max-width: 560px) {
          .artists-strip-section__strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .artists-strip-section__head {
            align-items: start;
          }
        }
      `}</style>
    </section>
  );
}
