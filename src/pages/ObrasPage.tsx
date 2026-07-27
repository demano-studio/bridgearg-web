import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { FALLBACK_ARTIST_NAME, getWorks, type WorkFromApi } from "@/lib/api";
import { images } from "@/lib/images";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/OptimizedImage";

/**
 * TODO - Base de datos:
 * Las obras actuales tienen títulos duplicados (datos demo).
 * Antes del lanzamiento, cargar obras reales con:
 * - Títulos únicos y descriptivos
 * - Campo 'year' completado (para el filtro de Newest/Oldest)
 * - Campo 'dimensions' completado o precio (para Details en ObraDetailPage)
 * - Imágenes reales (no las mismas fotos repetidas)
 */

const filterPanelLabelStyle: CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(252,248,234,0.85)",
  marginBottom: "9px",
};

const filterPanelControlStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(252,248,234,0.4)",
  backgroundColor: "transparent",
  padding: "12px",
  color: "#fcf8ea",
  outline: "none",
};

const navActionStyle: CSSProperties = {
  border: "1px solid rgba(252,248,234,0.6)",
  backgroundColor: "transparent",
  padding: "12px 16px",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: "11px",
  color: "#fcf8ea",
  cursor: "pointer",
  fontFamily: '"Onest", sans-serif',
};

const ArtworksPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
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

  const filteredWorks = useMemo(() => {
    const [rangeMin, rangeMax] = priceRange;

    return works.filter((work) => {
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
  }, [works, artistFilter, statusFilter, priceRange]);

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

  const renderWorkCard = (work: WorkFromApi, index: number) => {
    const artistName = work.artistName?.trim() || FALLBACK_ARTIST_NAME;
    const showOverlay = !work.available || work.status === "sold";

    const mediaBlock = (
      <Link
        to={`/artworks/${work.id}`}
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        <div className="media relative w-full overflow-hidden" style={{ backgroundColor: "transparent" }}>
          <OptimizedImage
            src={work.imagenUrl}
            title={work.title}
            artistName={artistName}
            variant="artwork"
            aspectRatio="4/5"
            priority={index < 6}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            imageClassName="transition-[filter] duration-300 ease-out saturate-[0.92] contrast-[0.97] group-hover:saturate-100 group-hover:contrast-100"
          />
          {showOverlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                backgroundColor: "rgba(30,21,23,0.46)",
                display: "grid",
                placeItems: "center",
                color: "#fcf8ea",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                pointerEvents: "none",
              }}
            >
              {overlayLabel(work)}
            </div>
          )}
        </div>
      </Link>
    );

    const infoLinkStyle: CSSProperties = {
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      fontFamily: '"Onest", sans-serif',
      textDecoration: "none",
      paddingBottom: "3px",
    };
    const infoLinkClassName =
      "border-b border-solid border-[rgba(252,248,234,0.4)] text-[#fcf8ea] transition-[color,border-color] duration-200 hover:text-[#7FB2D1] hover:border-[#7FB2D1]";

    const infoBlock = (
      <div
        className="info"
        style={{
          padding: "24px 24px 22px",
          minHeight: 174,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#1e1517",
          color: "#fcf8ea",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              color: "rgba(252,248,234,0.85)",
              marginBottom: "8px",
              fontFamily: '"Onest", sans-serif',
            }}
          >
            {artistName}
          </p>
          <h3
            style={{
              fontFamily: '"Onest", sans-serif',
              fontSize: "22px",
              letterSpacing: "-0.03em",
              margin: "0 0 18px",
              fontWeight: 500,
              color: "#fcf8ea",
            }}
          >
            {work.title}
          </h3>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 600,
              margin: "0 0 18px",
              color: "#fcf8ea",
              fontFamily: '"Onest", sans-serif',
            }}
          >
            {work.priceDisplay}
          </p>
        </div>
        <div
          className="card-actions flex flex-wrap gap-x-5 gap-y-2 opacity-65 transition-opacity duration-300 ease-out group-hover:opacity-100"
          style={{ fontFamily: '"Onest", sans-serif' }}
        >
          <Link
            to={`/artworks/${work.id}`}
            className={infoLinkClassName}
            style={infoLinkStyle}
          >
            View work
          </Link>
          {work.available ? (
            <Link
              to={`/contacto?obra=${encodeURIComponent(work.title)}&artista=${encodeURIComponent(artistName)}`}
              className={infoLinkClassName}
              style={infoLinkStyle}
            >
              Inquire
            </Link>
          ) : (
            <Link
              to={`/contacto?obra=${encodeURIComponent(work.title)}&tipo=private-collection`}
              className={infoLinkClassName}
              style={infoLinkStyle}
            >
              Inquire
            </Link>
          )}
        </div>
      </div>
    );

    const cardShellStyle: CSSProperties = {
      border: "1px solid rgba(30,21,23,0.18)",
      backgroundColor: "rgba(252,252,252,0.25)",
      position: "relative",
      overflow: "hidden",
      transition: "0.35s",
    };

    return (
      <article
        key={work.id}
        className="group"
        style={{
          breakInside: "avoid",
          marginBottom: "24px",
          display: "inline-block",
          width: "100%",
          ...cardShellStyle,
        }}
      >
        {mediaBlock}
        {infoBlock}
      </article>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Collection"
          description="Explore our collection of works by contemporary Argentine artists."
          url="/artworks"
        />
        <Header />
        <main ref={sectionRef}>
          {/* 1. Hero */}
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

          {/* 2. Nav row */}
          <div
            style={{
              position: isMobile ? "static" : "sticky",
              top: "80px",
              zIndex: 15,
              padding: isMobile ? "20px" : "28px clamp(24px, 7vw, 120px)",
              borderBottom: "1px solid rgba(30,21,23,0.18)",
              backgroundColor: "rgba(127,178,209,0.95)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "30px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="transition-colors duration-300 hover:bg-[#fcf8ea] hover:text-[#7FB2D1]"
                style={navActionStyle}
              >
                {filtersOpen ? "Filter works −" : "Filter works +"}
              </button>
              <select
                value={sortBy}
                className="transition-colors duration-300 hover:bg-[#fcf8ea] hover:text-[#7FB2D1]"
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
                style={{ ...navActionStyle, cursor: "pointer" }}
              >
                <option value="default">Sort by</option>
                <option value="price-asc">Price low to high</option>
                <option value="price-desc">Price high to low</option>
                <option value="az">Artist A–Z</option>
              </select>
            </div>
          </div>

          {/* 3. Filter panel */}
          {filtersOpen && (
            <div
              className="grid max-[679px]:grid-cols-1 max-[999px]:grid-cols-2 min-[1000px]:grid-cols-3"
              style={{
                marginLeft: isMobile ? "20px" : "clamp(24px, 7vw, 120px)",
                marginRight: isMobile ? "20px" : "clamp(24px, 7vw, 120px)",
                border: "1px solid rgba(252,248,234,0.4)",
                borderTop: "none",
                padding: isMobile ? "20px" : "28px",
                backgroundColor: "rgba(127,178,209,0.95)",
                gap: isMobile ? "14px" : "20px",
              }}
            >
              <div>
                <label style={filterPanelLabelStyle}>Artist</label>
                <select
                  value={artistFilter}
                  onChange={(e) => setArtistFilter(e.target.value)}
                  style={{ ...filterPanelControlStyle, fontFamily: '"Onest", sans-serif' }}
                >
                  <option value="">All artists</option>
                  {artistOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={filterPanelLabelStyle}>Availability</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "available" | "sold")}
                  style={{ ...filterPanelControlStyle, fontFamily: '"Onest", sans-serif' }}
                >
                  <option value="all">All</option>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(252,248,234,0.85)",
                    marginBottom: "12px",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  Price range
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#fcf8ea",
                      fontFamily: '"Onest", sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    USD {priceBounds.min.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#fcf8ea",
                      fontFamily: '"Onest", sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    USD {priceRange[1].toLocaleString()}
                  </span>
                </div>

                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceBounds.min, Number(e.target.value)])}
                  className="cream-slider"
                  style={{
                    width: "100%",
                    WebkitAppearance: "none",
                    appearance: "none",
                    height: "2px",
                    backgroundColor: "rgba(252,248,234,0.3)",
                    outline: "none",
                    cursor: "pointer",
                    accentColor: "#fcf8ea",
                  }}
                />
              </div>
            </div>
          )}

          {/* 4. Counter */}
          <p
            style={{
              margin: "30px clamp(24px, 7vw, 120px) 18px",
              fontSize: "11px",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "rgba(30,21,23,0.62)",
              fontFamily: '"Onest", sans-serif',
            }}
          >
            {sortedWorks.length} works
          </p>

          {/* 5. Works (masonry columns) */}
          <section>
            {loading ? (
              <div
                className="columns-1 sm:columns-2 lg:columns-3"
                style={{
                  padding: "0 clamp(24px, 7vw, 120px) 96px",
                  columnGap: "24px",
                  columnCount: isMobile ? 1 : isTablet ? 2 : 3,
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      breakInside: "avoid",
                      marginBottom: "24px",
                      display: "inline-block",
                      width: "100%",
                    }}
                  >
                    <div className="overflow-hidden border border-[rgba(30,21,23,0.18)] bg-[rgba(252,252,252,0.25)]">
                      <Skeleton className="aspect-[4/5] w-full" />
                      <div className="space-y-3 p-6">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-6 w-[80%]" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : works.length === 0 && !loading ? (
              <div
                className="py-24 text-center"
                style={{ paddingLeft: "clamp(24px, 7vw, 120px)", paddingRight: "clamp(24px, 7vw, 120px)" }}
              >
                <p className="text-sm text-muted-foreground" style={{ fontFamily: '"Onest", sans-serif' }}>
                  Could not load the collection. Please try again later.
                </p>
              </div>
            ) : sortedWorks.length === 0 ? (
              <div
                className="py-24 text-center"
                style={{ paddingLeft: "clamp(24px, 7vw, 120px)", paddingRight: "clamp(24px, 7vw, 120px)" }}
              >
                <p className="text-sm text-muted-foreground" style={{ fontFamily: '"Onest", sans-serif' }}>
                  No works match your current filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-4 inline-flex items-center border border-[rgba(30,21,23,0.18)] bg-transparent px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#1e1517] transition-colors hover:bg-[#1e1517] hover:text-[#fcf8ea]"
                  style={{ fontFamily: '"Onest", sans-serif' }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div
                className="columns-1 sm:columns-2 lg:columns-3"
                style={{
                  padding: "0 clamp(24px, 7vw, 120px) 96px",
                  columnGap: "24px",
                  columnCount: isMobile ? 1 : isTablet ? 2 : 3,
                }}
              >
                {sortedWorks.map((work, index) => renderWorkCard(work, index))}
              </div>
            )}
          </section>

          {/* 6. Quote */}
          <section
            className="grid grid-cols-1 min-[1000px]:grid-cols-[0.7fr_1.3fr] min-[1000px]:items-center"
            style={{
              padding: "94px clamp(24px, 7vw, 120px)",
              borderTop: "1px solid rgba(30,21,23,0.18)",
              borderBottom: "1px solid rgba(30,21,23,0.18)",
              gap: "50px",
            }}
          >
            <p
              style={{
                fontFamily: '"BestDB", "Caveat", cursive',
                fontStyle: "italic",
                fontSize: "clamp(48px, 5vw, 62px)",
                color: "#7FB2D1",
                transform: "rotate(-5deg)",
                display: "inline-block",
                margin: 0,
              }}
            >
              Handmade in Argentina
            </p>
            <p
              style={{
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(28px, 3vw, 38px)",
                lineHeight: 1.14,
                letterSpacing: "-0.05em",
                margin: 0,
                maxWidth: "850px",
                color: "#1e1517",
              }}
            >
              Works that are not only decorative, but also stories of craft, design and identity.
            </p>
          </section>

          {/* 7. Final CTA */}
          <section style={{ padding: "90px clamp(24px, 7vw, 120px) 110px", textAlign: "center" }}>
            <h2
              style={{
                fontFamily: '"Onest", sans-serif',
                fontSize: "clamp(44px, 5vw, 62px)",
                letterSpacing: "-0.06em",
                margin: "0 0 18px",
                fontWeight: 600,
                color: "#1e1517",
              }}
            >
              Looking for a specific piece?
            </h2>
            <p
              style={{
                color: "rgba(30,21,23,0.62)",
                margin: "0 auto 28px",
                maxWidth: "520px",
                lineHeight: 1.7,
                fontFamily: '"Onest", sans-serif',
              }}
            >
              BridgeArg can help you find the right artwork, confirm availability and coordinate the
              complete acquisition process.
            </p>
            <Link
              to="/contact"
              style={{
                border: "1px solid #1e1517",
                backgroundColor: "transparent",
                color: "#1e1517",
                padding: "13px 22px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: "11px",
                cursor: "pointer",
                transition: "0.25s",
                textDecoration: "none",
                display: "inline-block",
                fontFamily: '"Onest", sans-serif',
              }}
              className="hover:!bg-[#1e1517] hover:!text-[#fcf8ea]"
            >
              Inquire with BridgeArg
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtworksPage;
