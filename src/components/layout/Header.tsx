import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { getArtists, getWorks, type ArtistFromApi, type WorkFromApi } from "@/lib/api";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Artists", path: "/artistas" },
  { label: "Collection", path: "/artworks" },
  { label: "About", path: "/nosotros" },
  { label: "Contact", path: "/contacto" },
];

const logoLightSrc = "/assets/logos/BRIDGEARG - Exportacion logos-02.svg";
const desktopLogoWidth = "clamp(140px, 32vw, 260px)";

type SearchResults = {
  artists: ArtistFromApi[];
  works: WorkFromApi[];
};

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults>({ artists: [], works: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allDataRef = useRef<SearchResults | null>(null);
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const anyOpen = isOpen || isSearchOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || allDataRef.current) return;
    let cancelled = false;
    setIsSearching(true);
    Promise.all([getArtists(), getWorks()])
      .then(([artists, works]) => {
        if (cancelled) return;
        allDataRef.current = { artists, works };
        setDataLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load search data", err);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSearchOpen]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults({ artists: [], works: [] });
      return;
    }
    const data = allDataRef.current;
    if (!data) return;
    const artists = data.artists
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, 5);
    const works = data.works
      .filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.artistName.toLowerCase().includes(q),
      )
      .slice(0, 5);
    setSearchResults({ artists, works });
  }, [searchQuery, dataLoaded]);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50 border-b border-white/10"
        style={{
          backgroundColor: isHome
            ? scrolled
              ? "rgba(30,21,23,0.25)"
              : "transparent"
            : "rgba(30,21,23,0.55)",
          backdropFilter: isHome ? (scrolled ? "blur(20px)" : "none") : "blur(16px)",
          WebkitBackdropFilter: isHome ? (scrolled ? "blur(20px)" : "none") : "blur(16px)",
          transition: "background-color 0.4s ease, backdrop-filter 0.4s ease",
          borderBottomColor: isHome && !scrolled ? "transparent" : "rgba(255,255,255,0.08)",
          height: "var(--header-h)",
        }}
      >
        <div className="relative flex h-full items-center px-4">
          <Link
            to="/"
            aria-label="BridgeArg home"
            style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, width: desktopLogoWidth }}
          >
            <img
              src={logoLightSrc}
              alt="BridgeArg"
              className="block h-auto"
              style={{
                width: desktopLogoWidth,
                opacity: isHome ? (scrolled ? 1 : 0) : 1,
                transition: "opacity 0.4s ease",
              }}
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center font-display text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${
                    isActive ? "" : "hover:[color:rgba(252,248,234,0.7)]"
                  }`}
                  style={{ color: isActive ? "#fcf8ea" : "rgba(252,248,234,0.45)" }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="rounded-full"
                      style={{
                        width: 4,
                        height: 4,
                        marginTop: 4,
                        backgroundColor: "#7FB2D1",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/contact"
              className="hidden md:inline-flex"
              style={{
                fontFamily: '"Onest", sans-serif',
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#7FB2D1",
                textDecoration: "none",
                borderBottom: "1px solid #7FB2D1",
                paddingBottom: "2px",
              }}
            >
              I'm an Artist
            </Link>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center"
              aria-label="Open search"
              style={{ color: "#fcf8ea" }}
            >
              <Search size={24} strokeWidth={1.5} />
            </button>

            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="md:hidden flex h-10 w-10 items-center justify-center"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              <span className="relative block h-4 w-6">
                <span
                  className="absolute left-0 top-0 h-[2px] w-full bg-background"
                  style={{
                    transform: isOpen ? "translateY(7px) rotate(45deg)" : "none",
                    transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
                <span
                  className="absolute left-0 top-[7px] h-[2px] w-full bg-background"
                  style={{
                    opacity: isOpen ? 0 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                />
                <span
                  className="absolute left-0 top-[14px] h-[2px] w-full bg-background"
                  style={{
                    transform: isOpen ? "translateY(-7px) rotate(-45deg)" : "none",
                    transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 z-[55]"
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.35s ease",
        }}
      />

      <aside
        className="fixed right-0 top-0 z-[60] h-[100svh] w-full max-w-[420px]"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
          background: "rgba(30,21,23,0.45)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="flex items-center justify-between px-5"
          style={{ height: "var(--header-h)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Link to="/" className="flex items-center">
            <img src={logoLightSrc} alt="BridgeArg" className="block h-auto" style={{ width: "min(180px, 50vw)" }} />
          </Link>
          <button onClick={() => setIsOpen(false)} className="relative h-8 w-8" aria-label="Close menu">
            <span
              className="absolute left-1/2 top-1/2 h-[2px] w-6 bg-background"
              style={{ transform: "translate(-50%, -50%) rotate(45deg)" }}
            />
            <span
              className="absolute left-1/2 top-1/2 h-[2px] w-6 bg-background"
              style={{ transform: "translate(-50%, -50%) rotate(-45deg)" }}
            />
          </button>
        </div>

        <nav className="px-8 pt-10">
          {navItems.map((item, index) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="relative mb-6 block font-display text-lg uppercase tracking-[0.12em]"
                style={{
                  color: isActive ? "#fcf8ea" : "rgba(252,248,234,0.45)",
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? "translateX(0)" : "translateX(16px)",
                  transition: `opacity 0.35s ease ${index * 65}ms, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 65}ms`,
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                    style={{ right: "-18px", backgroundColor: "#7FB2D1" }}
                  />
                )}
              </Link>
            );
          })}
          <Link
            to="/contact"
            onClick={() => setIsOpen(false)}
            style={{
              fontFamily: '"Onest", sans-serif',
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              transform: "rotate(-7deg)",
              display: "inline-block",
              color: "#7FB2D1",
              textDecoration: "none",
              borderBottom: "1px solid #7FB2D1",
              paddingBottom: "2px",
              marginTop: "2rem",
            }}
          >
            I'm an Artist
          </Link>
        </nav>
      </aside>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="fixed inset-0 z-[60]"
        style={{
          backgroundColor: "rgba(30,21,23,0.45)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          opacity: isSearchOpen ? 1 : 0,
          pointerEvents: isSearchOpen ? "auto" : "none",
          transition: "opacity 0.4s ease",
        }}
      >
        <button
          onClick={closeSearch}
          className="absolute right-5 h-8 w-8"
          aria-label="Close search"
          style={{ top: "calc((var(--header-h) - 32px) / 2)" }}
        >
          <span
            className="absolute left-1/2 top-1/2 h-[2px] w-6 bg-background"
            style={{ transform: "translate(-50%, -50%) rotate(45deg)" }}
          />
          <span
            className="absolute left-1/2 top-1/2 h-[2px] w-6 bg-background"
            style={{ transform: "translate(-50%, -50%) rotate(-45deg)" }}
          />
        </button>

        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "min(1400px, 90vw)" }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search the site"
            className="block w-full bg-transparent outline-none placeholder:text-[#fcf8ea]/35"
            style={{
              borderBottom: "1px solid rgba(252,248,234,0.4)",
              color: "#fcf8ea",
              fontFamily: '"Onest", sans-serif',
              fontSize: "clamp(28px, 5vw, 64px)",
              fontWeight: 300,
              padding: "16px 0",
              minWidth: 0,
            }}
          />

          {searchQuery.trim().length > 0 && (
            <div
              style={{
                marginTop: "24px",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {isSearching && !dataLoaded ? (
                <p
                  style={{
                    color: "rgba(252,248,234,0.4)",
                    fontFamily: '"Onest", sans-serif',
                    fontSize: "clamp(14px, 1.4vw, 18px)",
                    padding: "12px 0",
                  }}
                >
                  Loading…
                </p>
              ) : (
                <>
                  {searchResults.artists.length > 0 && (
                    <section style={{ marginBottom: "24px" }}>
                      <h3
                        style={{
                          color: "rgba(252,248,234,0.5)",
                          fontFamily: '"Onest", sans-serif',
                          fontSize: "11px",
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          marginBottom: "8px",
                        }}
                      >
                        Artists
                      </h3>
                      {searchResults.artists.map((artist) => (
                        <Link
                          key={`artist-${artist.id}`}
                          to={`/artistas/${artist.slug}`}
                          onClick={closeSearch}
                          className="block transition-colors duration-200 hover:text-[#7FB2D1]"
                          style={{
                            color: "#fcf8ea",
                            fontFamily: '"Onest", sans-serif',
                            fontSize: "clamp(16px, 2vw, 22px)",
                            fontWeight: 400,
                            padding: "12px 0",
                            borderBottom: "1px solid rgba(252,248,234,0.08)",
                            textDecoration: "none",
                          }}
                        >
                          {artist.name}
                        </Link>
                      ))}
                    </section>
                  )}

                  {searchResults.works.length > 0 && (
                    <section>
                      <h3
                        style={{
                          color: "rgba(252,248,234,0.5)",
                          fontFamily: '"Onest", sans-serif',
                          fontSize: "11px",
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          marginBottom: "8px",
                        }}
                      >
                        Works
                      </h3>
                      {searchResults.works.map((work) => (
                        <Link
                          key={`work-${work.id}`}
                          to={`/artworks/${work.id}`}
                          onClick={closeSearch}
                          className="block transition-colors duration-200 hover:text-[#7FB2D1]"
                          style={{
                            color: "#fcf8ea",
                            fontFamily: '"Onest", sans-serif',
                            fontSize: "clamp(16px, 2vw, 22px)",
                            fontWeight: 400,
                            padding: "12px 0",
                            borderBottom: "1px solid rgba(252,248,234,0.08)",
                            textDecoration: "none",
                          }}
                        >
                          {work.artistName} — {work.title}
                        </Link>
                      ))}
                    </section>
                  )}

                  {searchQuery.trim().length > 2 &&
                    searchResults.artists.length === 0 &&
                    searchResults.works.length === 0 &&
                    dataLoaded && (
                      <p
                        style={{
                          color: "rgba(252,248,234,0.4)",
                          fontFamily: '"Onest", sans-serif',
                          fontSize: "clamp(14px, 1.4vw, 18px)",
                          padding: "12px 0",
                        }}
                      >
                        No results for “{searchQuery.trim()}”
                      </p>
                    )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
