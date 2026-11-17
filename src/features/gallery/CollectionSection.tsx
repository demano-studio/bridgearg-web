import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWorks, getWorksTotalCount, type WorkFromApi } from "@/lib/api";
import { OptimizedImage } from "@/components/OptimizedImage";

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

export function CollectionSection() {
  const [works, setWorks] = useState<DisplayWork[]>(
    FEATURED.map((w) => ({ ...w, imagenUrl: w.fallbackSrc }))
  );
  const [totalCount, setTotalCount] = useState<number | null>(91);

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
          })
        );
        if (count != null && count > 0) setTotalCount(count);
      })
      .catch(() => {
        /* keep curated fallbacks */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const viewAllLabel =
    totalCount != null ? `View all ${totalCount} works →` : "View all works →";

  return (
    <section
      id="collection"
      className="home-collection-section bg-background px-6 md:px-12 lg:px-24"
      style={{ scrollMarginTop: "calc(var(--header-h, 80px) + 16px)" }}
    >
      <div className="home-collection-section__wrap mx-auto max-w-[1800px]">
        <div className="home-collection-section__head">
          <div>
            <p className="home-collection-section__eyebrow">From the collection</p>
            <h2 className="home-collection-section__title">One work from each artist</h2>
            <p className="home-collection-section__lede">
              Painting, sculpture, drawing and hand embroidery. Every piece is original and travels
              with its certificate of authenticity.
            </p>
          </div>
          <Link to="/artworks" className="home-collection-section__view-all">
            {viewAllLabel}
          </Link>
        </div>

        <div className="home-collection-section__grid">
          {works.map((work, index) => (
            <Link
              key={work.id}
              to={`/artworks/${work.id}`}
              className="home-collection-section__work"
            >
              <div className="home-collection-section__mat">
                <OptimizedImage
                  src={work.imagenUrl}
                  title={work.title}
                  artistName={work.artistName}
                  variant={work.imagenUrl.startsWith("/assets/") ? "plain" : "artwork"}
                  className="!absolute !inset-[9%] !h-[82%] !w-[82%] !bg-transparent"
                  imageClassName="!object-contain !object-center drop-shadow-[0_6px_10px_rgba(30,21,23,0.12)]"
                  sizes="(max-width: 760px) 50vw, (max-width: 1100px) 25vw, 20vw"
                  priority={index < 4}
                />
              </div>
              <h3 className="home-collection-section__work-title">{work.title}</h3>
              <p className="home-collection-section__work-artist">{work.artistName}</p>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .home-collection-section {
          padding-block: clamp(64px, 9vw, 128px);
          padding-bottom: max(clamp(64px, 9vw, 128px), calc(env(safe-area-inset-bottom, 0px) + 5.5rem));
        }
        .home-collection-section__wrap {
          width: 100%;
        }
        .home-collection-section__head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: clamp(32px, 4vw, 56px);
        }
        .home-collection-section__eyebrow {
          margin: 0;
          font-family: "Onest", sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 400;
          color: #1e1517;
        }
        .home-collection-section__title {
          margin: 14px 0 0;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: clamp(32px, 4vw, 60px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #1e1517;
          text-wrap: balance;
        }
        .home-collection-section__lede {
          margin: 14px 0 0;
          max-width: 48ch;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: 16px;
          line-height: 1.6;
          color: #6b6365;
        }
        .home-collection-section__view-all {
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
        .home-collection-section__view-all:hover {
          color: #4a7fa0;
        }
        .home-collection-section__grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: clamp(16px, 2vw, 28px) clamp(12px, 1.6vw, 22px);
        }
        .home-collection-section__work {
          text-decoration: none;
          display: block;
          min-width: 0;
          color: inherit;
        }
        .home-collection-section__mat {
          position: relative;
          aspect-ratio: 4 / 5;
          max-width: 100%;
          background: #fffdf6;
          box-shadow: 0 0 0 1px rgba(30, 21, 23, 0.14);
          transition: box-shadow 0.3s;
        }
        .home-collection-section__work:hover .home-collection-section__mat {
          box-shadow: 0 0 0 1px #1e1517;
        }
        .home-collection-section__work-title {
          font-family: "Onest", sans-serif;
          font-size: 15px;
          font-weight: 400;
          margin: 12px 0 0;
          letter-spacing: 0;
          color: #1e1517;
          line-height: 1.3;
        }
        .home-collection-section__work-artist {
          margin: 2px 0 0;
          font-family: "Onest", sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: #6b6365;
          line-height: 1.35;
        }
        @media (max-width: 1100px) {
          .home-collection-section__grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          .home-collection-section__work:nth-child(n+9) {
            display: none;
          }
        }
        @media (max-width: 760px) {
          .home-collection-section__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .home-collection-section__work:nth-child(n+9) {
            display: block;
          }
          .home-collection-section__head {
            align-items: start;
          }
        }
      `}</style>
    </section>
  );
}
