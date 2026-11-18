import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NewsletterInvite } from "@/components/NewsletterInvite";
import { PageTransition } from "@/components/PageTransition";
import { FALLBACK_ARTIST_NAME, getWorks, type WorkFromApi } from "@/lib/api";
import { curatedCollectionOrder, getCollectionSeed } from "@/lib/collectionOrder";
import { shouldShowPrice } from "@/lib/geoPricing";
import { images } from "@/lib/images";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/OptimizedImage";
import "@/styles/collection.css";

/**
 * TODO - Base de datos:
 * Las obras actuales tienen títulos duplicados (datos demo).
 * Antes del lanzamiento, cargar obras reales con:
 * - Títulos únicos y descriptivos
 * - Campo 'year' completado (para el filtro de Newest/Oldest)
 * - Campo 'dimensions' completado o precio (para Details en ObraDetailPage)
 * - Imágenes reales (no las mismas fotos repetidas)
 */

/** Provisional image height/width until real ratio is known (4/5 box). */
const PROVISIONAL_HW = 5 / 4;
const META_EST_PX = 140;
const COL_WIDTH_EST = 400;

function workHwRatio(work: WorkFromApi, measured: Record<number, number>): number {
  const w = work.width_cm != null ? Number(work.width_cm) : 0;
  const h = work.height_cm != null ? Number(work.height_cm) : 0;
  if (w > 0 && h > 0) return h / w;
  const m = measured[work.id];
  if (typeof m === "number" && m > 0) return m;
  return PROVISIONAL_HW;
}

function workAspectCss(work: WorkFromApi, measured: Record<number, number>): string {
  const w = work.width_cm != null ? Number(work.width_cm) : 0;
  const h = work.height_cm != null ? Number(work.height_cm) : 0;
  if (w > 0 && h > 0) return `${w} / ${h}`;
  const m = measured[work.id];
  if (typeof m === "number" && m > 0) return `1 / ${m}`;
  return "4 / 5";
}

/** Left-to-right order preserved: each item goes to the current shortest column. */
function distributeShortestColumn(
  works: WorkFromApi[],
  columnCount: number,
  measured: Record<number, number>,
): WorkFromApi[][] {
  const cols: WorkFromApi[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);
  for (const work of works) {
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    cols[shortest].push(work);
    heights[shortest] += workHwRatio(work, measured) * COL_WIDTH_EST + META_EST_PX;
  }
  return cols;
}

function useCollectionColumnCount(): number {
  const [count, setCount] = useState(() => {
    if (typeof window === "undefined") return 3;
    if (window.matchMedia("(max-width: 560px)").matches) return 1;
    if (window.matchMedia("(max-width: 1000px)").matches) return 2;
    return 3;
  });

  useEffect(() => {
    const mq560 = window.matchMedia("(max-width: 560px)");
    const mq1000 = window.matchMedia("(max-width: 1000px)");
    const update = () => {
      if (mq560.matches) setCount(1);
      else if (mq1000.matches) setCount(2);
      else setCount(3);
    };
    update();
    mq560.addEventListener("change", update);
    mq1000.addEventListener("change", update);
    return () => {
      mq560.removeEventListener("change", update);
      mq1000.removeEventListener("change", update);
    };
  }, []);

  return count;
}

const ArtworksPage = () => {
  const isMobile = useIsMobile();
  const columnCount = useCollectionColumnCount();
  const sectionRef = useRef<HTMLElement>(null);
  const [searchParams] = useSearchParams();
  const {
    data: works = [],
    isLoading: loading,
    isError,
  } = useQuery<WorkFromApi[]>({
    queryKey: ["works"],
    queryFn: () => getWorks(),
  });

  const [artistFilter, setArtistFilter] = useState<string>(searchParams.get("artist") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold">("all");
  const [sortBy, setSortBy] = useState<
    "default" | "price-asc" | "price-desc" | "newest" | "oldest" | "az"
  >("default");
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** Session-stable mix seed — generated once per visit (sessionStorage). */
  const [mixSeed] = useState(() => getCollectionSeed());
  /** Measured image height/width ratios (when DB dims are missing). */
  const [measuredRatios, setMeasuredRatios] = useState<Record<number, number>>({});

  useEffect(() => {
    const artistParam = searchParams.get("artist");
    if (artistParam) {
      setArtistFilter(artistParam);
    }
  }, [searchParams]);

  const priceBounds = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    works.forEach((work) => {
      if (!work.available) return;
      const p = work.price_usd;
      if (typeof p === "number" && !Number.isNaN(p)) {
        if (p < min) min = p;
        if (p > max) max = p;
      }
    });
    if (!Number.isFinite(min)) {
      min = 0;
    }
    if (max < min) {
      max = min;
    }
    const clampedMin = 0;
    const clampedMax = Math.max(max, 8000);
    return { min: clampedMin, max: clampedMax };
  }, [works]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, Infinity]);

  useEffect(() => {
    setPriceRange([priceBounds.min, priceBounds.max]);
  }, [priceBounds.min, priceBounds.max]);

  useEffect(() => {
    if (priceRange[1] === Infinity && priceBounds.max > 0) {
      setPriceRange([priceBounds.min, priceBounds.max]);
    }
  }, [priceBounds]);

  const artistOptions = useMemo(() => {
    const names = Array.from(
      new Set(works.map((work) => work.artistName?.trim() || FALLBACK_ARTIST_NAME)),
    );
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [works]);

  /** Mix the full collection once; filters keep relative order from this list. */
  const mixedWorks = useMemo(
    () => curatedCollectionOrder(works, mixSeed),
    [works, mixSeed],
  );

  const filteredWorks = useMemo(() => {
    const [rangeMin, rangeMax] = priceRange;

    return mixedWorks.filter((work) => {
      const artistName = work.artistName?.trim() || FALLBACK_ARTIST_NAME;

      const matchesArtist = !artistFilter || artistName === artistFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "available"
            ? work.available
            : !work.available;

      const price = work.price_usd;
      const matchesPrice =
        !work.available ||
        typeof price !== "number" ||
        Number.isNaN(price) ||
        (price >= rangeMin && price <= rangeMax);

      return matchesArtist && matchesStatus && matchesPrice;
    });
  }, [mixedWorks, artistFilter, statusFilter, priceRange]);

  const sortedWorks = useMemo(() => {
    const list = [...filteredWorks];

    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => {
          if (!a.available && !b.available) return 0;
          if (!a.available) return 1;
          if (!b.available) return -1;

          const paRaw = a.price_usd;
          const pbRaw = b.price_usd;
          const pa =
            typeof paRaw !== "number" || Number.isNaN(paRaw)
              ? Number.POSITIVE_INFINITY
              : paRaw;
          const pb =
            typeof pbRaw !== "number" || Number.isNaN(pbRaw)
              ? Number.POSITIVE_INFINITY
              : pbRaw;
          return pa - pb;
        });
      case "price-desc":
        return list.sort((a, b) => {
          if (!a.available && !b.available) return 0;
          if (!a.available) return 1;
          if (!b.available) return -1;

          const paRaw = a.price_usd;
          const pbRaw = b.price_usd;
          const pa =
            typeof paRaw !== "number" || Number.isNaN(paRaw)
              ? Number.NEGATIVE_INFINITY
              : paRaw;
          const pb =
            typeof pbRaw !== "number" || Number.isNaN(pbRaw)
              ? Number.NEGATIVE_INFINITY
              : pbRaw;
          return pb - pa;
        });
      case "az":
        return list.sort((a, b) => {
          const an = (a.artistName?.trim() || FALLBACK_ARTIST_NAME).localeCompare(
            b.artistName?.trim() || FALLBACK_ARTIST_NAME,
            undefined,
            { sensitivity: "base" },
          );
          return an;
        });
      case "newest":
        return list.sort((a, b) => {
          const ya = a.year ? parseInt(a.year, 10) : 0;
          const yb = b.year ? parseInt(b.year, 10) : 0;
          if (isNaN(ya) && isNaN(yb)) return 0;
          if (isNaN(ya)) return 1;
          if (isNaN(yb)) return -1;
          return yb - ya;
        });
      case "oldest":
        return list.sort((a, b) => {
          const ya = a.year ? parseInt(a.year, 10) : 0;
          const yb = b.year ? parseInt(b.year, 10) : 0;
          if (isNaN(ya) && isNaN(yb)) return 0;
          if (isNaN(ya)) return 1;
          if (isNaN(yb)) return -1;
          return ya - yb;
        });
      case "default":
      default:
        // Already in curated mix order (mixed → filtered).
        return list;
    }
  }, [filteredWorks, sortBy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1 },
    );

    const elements = sectionRef.current?.querySelectorAll(".scroll-reveal");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [filteredWorks]);

  useEffect(() => {
    if (isError) {
      toast({ title: "Error", description: "Could not load works.", variant: "destructive" });
    }
  }, [isError]);

  const clearAllFilters = () => {
    setArtistFilter("");
    setStatusFilter("all");
    setPriceRange([priceBounds.min, priceBounds.max]);
    setSortBy("default");
  };

  const overlayLabel = (work: WorkFromApi) => {
    if (work.status === "sold") return "Sold";
    if (work.status === "reserved") return "Reserved";
    return "Private collection";
  };

  const masonryColumns = useMemo(
    () => distributeShortestColumn(sortedWorks, columnCount, measuredRatios),
    [sortedWorks, columnCount, measuredRatios],
  );

  const listIndexById = useMemo(() => {
    const map = new Map<number, number>();
    sortedWorks.forEach((w, i) => map.set(w.id, i));
    return map;
  }, [sortedWorks]);

  const onCardNaturalSize = (work: WorkFromApi, nw: number, nh: number) => {
    const hasDims =
      work.width_cm != null &&
      work.height_cm != null &&
      Number(work.width_cm) > 0 &&
      Number(work.height_cm) > 0;
    if (hasDims || nw <= 0 || nh <= 0) return;
    const next = nh / nw;
    setMeasuredRatios((prev) => {
      const prevRatio = prev[work.id];
      if (typeof prevRatio === "number" && Math.abs(prevRatio - next) < 0.002) return prev;
      return { ...prev, [work.id]: next };
    });
  };

  const renderWorkCard = (work: WorkFromApi) => {
    const artistName = work.artistName?.trim() || FALLBACK_ARTIST_NAME;
    const showOverlay = !work.available || work.status === "sold";
    const index = listIndexById.get(work.id) ?? 0;
    const hasDims =
      work.width_cm != null &&
      work.height_cm != null &&
      Number(work.width_cm) > 0 &&
      Number(work.height_cm) > 0;

    return (
      <article key={work.id} className="collection-card group">
        <Link to={`/artworks/${work.id}`} className="collection-card__media relative">
          <OptimizedImage
            src={work.imagenUrl}
            title={work.title}
            artistName={artistName}
            variant="artwork"
            layout="intrinsic"
            aspectRatio={workAspectCss(work, measuredRatios)}
            width={hasDims ? Math.round(Number(work.width_cm)) : undefined}
            height={hasDims ? Math.round(Number(work.height_cm)) : undefined}
            priority={index < 6}
            sizes="(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 33vw"
            className="!bg-[#efe7cf]"
            imageClassName="collection-card__img saturate-[0.92] contrast-[0.97]"
            onNaturalSize={(nw, nh) => onCardNaturalSize(work, nw, nh)}
          />
          {showOverlay && <div className="collection-card__overlay">{overlayLabel(work)}</div>}
        </Link>

        <div className="collection-card__info">
          <p className="collection-card__artist">{artistName}</p>
          <h3 className="collection-card__title">{work.title}</h3>
          <p className="collection-card__price">
            {shouldShowPrice() ? work.priceDisplay : "Price on request"}
          </p>
          <div className="collection-card__actions">
            <Link to={`/artworks/${work.id}`} className="collection-card__link">
              View work
            </Link>
            {work.available ? (
              <Link
                to={`/contacto?obra=${encodeURIComponent(work.title)}&artista=${encodeURIComponent(artistName)}`}
                className="collection-card__link"
              >
                Inquire
              </Link>
            ) : (
              <Link
                to={`/contacto?obra=${encodeURIComponent(work.title)}&tipo=private-collection`}
                className="collection-card__link"
              >
                Inquire
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <PageTransition>
      <div className="collection-page min-h-screen">
        <SEO
          title="Collection"
          description="Explore our collection of works by contemporary Argentine artists."
          url="/artworks"
        />
        <Header />
        <main ref={sectionRef}>
          {/* 1. Hero — unchanged */}
          <section
            className="grid grid-cols-1 min-[1000px]:grid-cols-[1.2fr_0.8fr] min-[1000px]:items-end"
            style={{
              minHeight: isMobile ? "auto" : "100vh",
              padding: isMobile
                ? "40px 20px"
                : "clamp(120px, 18vh, 180px) clamp(24px, 7vw, 120px) clamp(60px, 10vh, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.18)",
              gap: isMobile ? "24px" : "clamp(40px, 6vw, 80px)",
              position: "relative",
              overflow: "hidden",
              backgroundImage: `linear-gradient(rgba(30,21,23,0.55), rgba(30,21,23,0.65)), url('${images.collectionsHero}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(252,248,234,0.7)",
                  marginBottom: "22px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Curated collection
              </p>
              <h1
                style={{
                  margin: 0,
                  maxWidth: "860px",
                  fontSize: "clamp(64px, 9vw, 156px)",
                  letterSpacing: "-0.075em",
                  lineHeight: 0.86,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: '"Onest", sans-serif',
                    fontWeight: 800,
                    color: "#fcf8ea",
                  }}
                >
                  Curated
                </span>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: '"BestDB", "Caveat", cursive',
                    fontWeight: 400,
                    color: "#7FB2D1",
                    transform: "rotate(-7deg)",
                    transformOrigin: "left center",
                    marginTop: "clamp(8px, 1.5vh, 20px)",
                  }}
                >
                  Works
                </span>
              </h1>
              <p
                style={{
                  fontSize: "clamp(15px, 1.4vw, 19px)",
                  lineHeight: 1.55,
                  color: "rgba(252,248,234,0.85)",
                  maxWidth: "520px",
                  marginTop: "36px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                A selection of Argentine pieces chosen for their materiality, story and cultural value.
                Objects that are craft, identity and quiet presence.
              </p>
            </div>
            <aside
              className="max-[999px]:max-w-none max-[999px]:justify-self-stretch max-[999px]:border-t max-[999px]:border-[rgba(252,248,234,0.3)] max-[999px]:border-l-0 max-[999px]:pl-0 max-[999px]:pt-7 min-[1000px]:max-w-[330px] min-[1000px]:justify-self-end min-[1000px]:border-l min-[1000px]:border-[rgba(252,248,234,0.3)] min-[1000px]:pl-[34px]"
              style={{
                alignSelf: "center",
              }}
            >
              <p
                style={{
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontStyle: "italic",
                  color: "#7FB2D1",
                  fontSize: "clamp(26px, 2.5vw, 34px)",
                  lineHeight: 1.1,
                  marginBottom: "22px",
                  transform: "rotate(-4deg)",
                  display: "inline-block",
                }}
              >
                Pieces that cross bridges
              </p>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: "rgba(252,248,234,0.75)",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Every artwork is presented with the same care it received in the studio: photographed,
                framed and curated to let the piece speak first.
              </p>
            </aside>
          </section>

          <div className="collection-body">
            <div className="collection-wrap">
              {/* 2. Filter / sort bar */}
              <div className="collection-toolbar">
                <div className="collection-toolbar__inner">
                  <p className="collection-eyebrow">{sortedWorks.length} works</p>
                  <div className="collection-toolbar__actions">
                    <button
                      type="button"
                      className="collection-pill"
                      onClick={() => setFiltersOpen((o) => !o)}
                    >
                      {filtersOpen ? "Filter works −" : "Filter works +"}
                    </button>
                    <div className="collection-sort">
                      <select
                        value={sortBy}
                        aria-label="Sort by"
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as
                              | "default"
                              | "price-asc"
                              | "price-desc"
                              | "newest"
                              | "oldest"
                              | "az",
                          )
                        }
                      >
                        <option value="default">Curated mix</option>
                        <option value="price-asc">Price low to high</option>
                        <option value="price-desc">Price high to low</option>
                        <option value="az">Artist A–Z</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Filter panel */}
              {filtersOpen && (
                <>
                  <div className="collection-filters">
                    <div className="collection-filters__col">
                      <p className="collection-filters__heading" id="collection-filter-artist-label">
                        Artist
                      </p>
                      <div
                        className="collection-filters__chips"
                        role="group"
                        aria-labelledby="collection-filter-artist-label"
                      >
                        <button
                          type="button"
                          className="collection-filters__chip"
                          aria-pressed={artistFilter === ""}
                          onClick={() => setArtistFilter("")}
                        >
                          All artists
                        </button>
                        {artistOptions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="collection-filters__chip"
                            aria-pressed={artistFilter === name}
                            onClick={() => setArtistFilter(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="collection-filters__col">
                      <p className="collection-filters__heading" id="collection-filter-status-label">
                        Availability
                      </p>
                      <div
                        className="collection-filters__segment"
                        role="group"
                        aria-label="Availability"
                        aria-labelledby="collection-filter-status-label"
                      >
                        {(
                          [
                            { value: "all", label: "All" },
                            { value: "available", label: "Available" },
                            { value: "sold", label: "Sold" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="collection-filters__segment-btn"
                            aria-pressed={statusFilter === opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="collection-filters__col">
                      <p className="collection-filters__heading" id="collection-filter-price-label">
                        Price range
                      </p>
                      <div className="collection-filters__range-labels">
                        <span>USD {priceBounds.min.toLocaleString()}</span>
                        <span>
                          USD{" "}
                          {(Number.isFinite(priceRange[1])
                            ? priceRange[1]
                            : priceBounds.max
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="collection-filters__slider-wrap">
                        <div className="collection-filters__slider-rail" aria-hidden="true">
                          <div
                            className="collection-filters__slider-fill"
                            style={{
                              width: `${
                                priceBounds.max > priceBounds.min
                                  ? ((Math.min(
                                      Number.isFinite(priceRange[1])
                                        ? priceRange[1]
                                        : priceBounds.max,
                                      priceBounds.max,
                                    ) -
                                      priceBounds.min) /
                                      (priceBounds.max - priceBounds.min)) *
                                    100
                                  : 100
                              }%`,
                            }}
                          />
                        </div>
                        <input
                          id="collection-filter-price"
                          type="range"
                          min={priceBounds.min}
                          max={priceBounds.max}
                          value={
                            Number.isFinite(priceRange[1]) ? priceRange[1] : priceBounds.max
                          }
                          onChange={(e) =>
                            setPriceRange([priceBounds.min, Number(e.target.value)])
                          }
                          aria-labelledby="collection-filter-price-label"
                          className="collection-filters__slider"
                        />
                      </div>
                      <button
                        type="button"
                        className="link-btn collection-filters__clear"
                        onClick={clearAllFilters}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  {(artistFilter !== "" ||
                    statusFilter !== "all" ||
                    (Number.isFinite(priceRange[1]) &&
                      priceRange[1] < priceBounds.max)) && (
                    <div className="collection-filters__applied" aria-label="Active filters">
                      {artistFilter !== "" && (
                        <button
                          type="button"
                          className="collection-filters__applied-chip"
                          onClick={() => setArtistFilter("")}
                        >
                          {artistFilter} <span aria-hidden="true">✕</span>
                          <span className="sr-only">Remove artist filter</span>
                        </button>
                      )}
                      {statusFilter !== "all" && (
                        <button
                          type="button"
                          className="collection-filters__applied-chip"
                          onClick={() => setStatusFilter("all")}
                        >
                          {statusFilter === "available" ? "Available" : "Sold"}{" "}
                          <span aria-hidden="true">✕</span>
                          <span className="sr-only">Remove availability filter</span>
                        </button>
                      )}
                      {Number.isFinite(priceRange[1]) && priceRange[1] < priceBounds.max && (
                        <button
                          type="button"
                          className="collection-filters__applied-chip"
                          onClick={() =>
                            setPriceRange([priceBounds.min, priceBounds.max])
                          }
                        >
                          Price: USD {priceBounds.min.toLocaleString()}–
                          {priceRange[1].toLocaleString()}{" "}
                          <span aria-hidden="true">✕</span>
                          <span className="sr-only">Remove price filter</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 4. Newsletter */}
              <NewsletterInvite />

              {/* 5. Works grid — shortest-column masonry (LTR order) */}
              <section
                className={`collection-grid${loading || works.length === 0 || sortedWorks.length === 0 ? " collection-grid--solo" : ""}`}
                aria-label="Works"
              >
                {loading ? (
                  <div className="collection-grid" style={{ padding: 0, width: "100%" }}>
                    {Array.from({ length: columnCount }).map((_, col) => (
                      <div key={col} className="collection-grid__col">
                        {Array.from({ length: 2 }).map((__, i) => (
                          <div key={i} className="collection-card">
                            <Skeleton className="aspect-[4/5] w-full !bg-[#efe7cf]" />
                            <div className="collection-card__info space-y-3">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-7 w-[80%]" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : works.length === 0 ? (
                  <div className="collection-empty">
                    <p>Could not load the collection. Please try again later.</p>
                  </div>
                ) : sortedWorks.length === 0 ? (
                  <div className="collection-empty">
                    <p>No works match your current filters.</p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="collection-pill collection-empty__btn"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  masonryColumns.map((col, colIndex) => (
                    <div key={colIndex} className="collection-grid__col">
                      {col.map((work) => renderWorkCard(work))}
                    </div>
                  ))
                )}
              </section>
            </div>

            {/* 6. Close */}
            <section className="collection-close">
              <div className="collection-wrap">
                <div className="collection-close__grid">
                  <div>
                    <p className="collection-close__eyebrow">(Handmade in Argentina)</p>
                    <h2 className="collection-close__title">
                      Handmade in
                      <span className="collection-script">Argentina</span>
                    </h2>
                  </div>
                  <div>
                    <p className="collection-close__copy">
                      Works that are not only decorative, but also stories of craft, design and
                      identity.
                    </p>
                    <p className="collection-close__ask">Looking for a specific piece?</p>
                    <p className="collection-close__help">
                      BridgeArg can help you find the right artwork, confirm availability and
                      coordinate the complete acquisition process.
                    </p>
                    <Link to="/contact" className="collection-close__btn">
                      Inquire with BridgeArg <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtworksPage;
