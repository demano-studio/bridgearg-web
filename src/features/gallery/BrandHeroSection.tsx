import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getAvailableCount } from "@/lib/api";
import { images } from "@/lib/images";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const heroImages = [
  images.fondoJose,
  images.fondoMariano,
  images.fondoTulio,
  images.fondoAle,
  images.fondoHora,
  images.fondoCaro,
  images.fondoBoyo,
  images.fondoFabio,
  images.fondoRoger,
  images.fondoSara,
];
const heroArtists = [
  "Jose Benito",
  "Mariano Castañeda",
  "Tulio Romano",
  "Alejandra Espinosa",
  "Hora French",
  "Carolina Caeiro",
  "Boyo Quintana",
  "Fabio Egea",
  "Roger Mantegani",
  "Sara Goldman",
];
const SLIDE_DURATION = 9000; // milisegundos

export interface BrandHeroProps {
  logoWidth?: string;
}

export function BrandHeroSection({ logoWidth = "420px" }: BrandHeroProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressRunId, setProgressRunId] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const firstTickTimeoutRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLSpanElement | null>(null);
  const slideStartedAtRef = useRef<number>(Date.now());
  const elapsedOnCurrentSlideRef = useRef<number>(0);

  useEffect(() => {
    getAvailableCount()
      .then(setAvailableCount)
      .catch(() => {});
  }, []);

  const clearSlideInterval = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearFirstTickTimeout = () => {
    if (firstTickTimeoutRef.current !== null) {
      window.clearTimeout(firstTickTimeoutRef.current);
      firstTickTimeoutRef.current = null;
    }
  };

  const clearSlideTimers = () => {
    clearSlideInterval();
    clearFirstTickTimeout();
  };

  const startSlideInterval = (startWithRemaining = false) => {
    clearSlideTimers();
    clearSlideInterval();
    if (!isPlaying) return;
    const startRegularInterval = () => {
      slideStartedAtRef.current = Date.now();
      elapsedOnCurrentSlideRef.current = 0;
      intervalRef.current = window.setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % heroImages.length);
        setProgressRunId((prev) => prev + 1);
        slideStartedAtRef.current = Date.now();
        elapsedOnCurrentSlideRef.current = 0;
      }, SLIDE_DURATION);
    };

    if (startWithRemaining) {
      const remaining = Math.max(
        0,
        Math.min(SLIDE_DURATION, SLIDE_DURATION - elapsedOnCurrentSlideRef.current),
      );
      slideStartedAtRef.current = Date.now() - elapsedOnCurrentSlideRef.current;
      firstTickTimeoutRef.current = window.setTimeout(() => {
        setActiveImageIndex((prev) => (prev + 1) % heroImages.length);
        setProgressRunId((prev) => prev + 1);
        startRegularInterval();
      }, remaining);
      return;
    }

    startRegularInterval();
  };

  useEffect(() => {
    if (isPlaying) startSlideInterval(true);
    return () => clearSlideTimers();
  }, [isPlaying]);

  useEffect(() => {
    const activeSrc = heroImages[activeImageIndex];
    if (activeSrc) {
      const img = new Image();
      img.src = activeSrc;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const preloadRest = () => {
      if (cancelled) return;
      heroImages.forEach((src, index) => {
        if (index === activeImageIndex) return;
        const img = new Image();
        img.src = src;
      });
    };

    const schedulePreload = () => {
      if (document.readyState === "complete") {
        const win = window as Window & {
          requestIdleCallback?: (callback: IdleRequestCallback) => number;
          cancelIdleCallback?: (handle: number) => void;
        };
        if (typeof win.requestIdleCallback === "function") {
          idleId = win.requestIdleCallback(() => preloadRest());
        } else {
          timeoutId = window.setTimeout(() => preloadRest(), 1);
        }
        return;
      }

      window.addEventListener("load", preloadRest, { once: true });
    };

    schedulePreload();

    return () => {
      cancelled = true;
      window.removeEventListener("load", preloadRest);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      const win = window as Window & {
        cancelIdleCallback?: (handle: number) => void;
      };
      if (idleId !== null && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId);
      }
    };
  }, []);

  const resetProgressAnimationFromZero = () => {
    requestAnimationFrame(() => {
      const el = progressBarRef.current;
      if (!el) return;
      el.style.animation = "none";
      void el.offsetWidth;
      requestAnimationFrame(() => {
        const current = progressBarRef.current;
        if (!current) return;
        current.style.animation = `hero-progress-fill ${SLIDE_DURATION}ms linear forwards`;
        current.style.animationPlayState = isPlaying ? "running" : "paused";
      });
    });
  };

  const resetSlideClock = () => {
    slideStartedAtRef.current = Date.now();
    elapsedOnCurrentSlideRef.current = 0;
  };

  const goToIndex = (index: number) => {
    setActiveImageIndex(index);
    setProgressRunId((prev) => prev + 1);
    resetSlideClock();
    startSlideInterval(false);
    resetProgressAnimationFromZero();
  };

  const goToPrev = () => {
    setActiveImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
    setProgressRunId((prev) => prev + 1);
    resetSlideClock();
    startSlideInterval(false);
    resetProgressAnimationFromZero();
  };

  const goToNext = () => {
    setActiveImageIndex((prev) => (prev + 1) % heroImages.length);
    setProgressRunId((prev) => prev + 1);
    resetSlideClock();
    startSlideInterval(false);
    resetProgressAnimationFromZero();
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      elapsedOnCurrentSlideRef.current = Math.min(
        SLIDE_DURATION,
        Date.now() - slideStartedAtRef.current,
      );
      clearSlideTimers();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
  };

  void logoWidth;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        isolation: "isolate",
        paddingTop: "var(--header-h)",
        minHeight: isMobile ? "auto" : "100svh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}
      >
        {heroImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url("${src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: activeImageIndex === index ? 1 : 0,
              transition: "opacity 1.5s ease-in-out",
            }}
          />
        ))}
      </div>

      <div
        aria-hidden
        className="bg-gradient-to-b from-[#1e1517]/20 via-[#1e1517]/65 to-[#1e1517]/85"
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />

      {/* availableCount !== null && (
          <div className="absolute right-6 top-24 z-20 text-right md:right-12 md:top-28 lg:right-24">
          <p className="font-display text-base font-semibold uppercase tracking-[0.18em] text-white/80">
            Available works
          </p>
          <p className="font-display text-6xl font-bold text-white">
            {availableCount}
          </p>
        </div>
      ) */}


      <motion.div
        className="relative w-full"
        style={{
          zIndex: 10,
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "calc(100svh - var(--header-h))",
          paddingLeft: isMobile ? "20px" : "clamp(24px, 6vw, 96px)",
          paddingRight: isMobile ? "20px" : "clamp(24px, 6vw, 96px)",
          paddingTop: isMobile ? "20px" : "clamp(24px, 4svh, 64px)",
          paddingBottom: isMobile ? "100px" : "clamp(120px, 16svh, 200px)",
          gap: isMobile ? "24px" : "clamp(32px, 6svh, 80px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0 }}
      >
        <img
          src="/assets/logos/BRIDGEARG - Exportacion logos-02.svg"
          alt="BridgeArg"
          fetchPriority="high"
          loading="eager"
          style={{
            alignSelf: "center",
            width: "min(520px, 72vw)",
            height: "auto",
            display: "block",
            flexShrink: 0,
          }}
        />

        <div
          className="flex w-full flex-col items-start md:flex-row md:items-center md:justify-start"
          style={{ gap: "clamp(16px, 4vw, 40px)" }}
        >
          <div className="max-w-[700px]" style={{ flex: "1" }}>
            <span style={{
              fontFamily: '"Onest", sans-serif',
              fontSize: "clamp(14px, 1.5vw, 20px)",
              color: "#7FB2D1",
                display: "block",
                marginBottom: "16px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                lineHeight: 1,
                textTransform: "uppercase",
              }}
            >
              Ambassadors of Argentine Art
            </span>
            <h1 style={{ lineHeight: 1.05, marginBottom: "0" }}>
              <span
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontWeight: 900,
                  fontSize: "clamp(40px, 6vw, 80px)",
                  ...(isMobile ? { fontSize: "44px" } : {}),
                  color: "#ffffff",
                  display: "block",
                  letterSpacing: "-0.03em",
                }}
              >
                Curating the art
              </span>
              <span
                style={{
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontWeight: 400,
                  fontSize: "clamp(40px, 6vw, 70px)",
                  ...(isMobile ? { fontSize: "38px" } : {}),
                  color: "#7FB2D1",
                  display: "block",
                  letterSpacing: "-0.01em",
                  transform: "rotate(-7deg)",
                  transformOrigin: "left center",
                  marginTop: "25px",
                }}
              >
                from the End of the World.
              </span>
            </h1>
            <p className="font-display text-2xl font-light text-white/90 leading-relaxed mt-7 max-w-[min(100%,660px)]" style={{ fontSize: "clamp(16px, 1.8vw, 26px)" }}>
              Connecting extraordinary Argentine contemporary art with global collectors — professionally, legally,
              and sustainably.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? "12px" : "16px",
                alignItems: "center",
                flexShrink: 0,
                marginTop: "clamp(28px, 5svh, 80px)",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/artworks"
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(11px, 1.1vw, 15px)",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.4)",
                  padding: "8px 0",
                  display: "inline-block",
                  textDecoration: "none",
                  transition: "color 0.3s ease, borderColor 0.3s ease, letterSpacing 0.3s ease",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.color = "#7FB2D1";
                  el.style.borderBottomColor = "#7FB2D1";
                  el.style.letterSpacing = "0.35em";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.color = "#ffffff";
                  el.style.borderBottomColor = "rgba(255,255,255,0.4)";
                  el.style.letterSpacing = "0.25em";
                }}
              >
                View the Collection
              </Link>
              <Link
                to="/artistas"
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(11px, 1.1vw, 15px)",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.4)",
                  padding: "8px 0",
                  display: "inline-block",
                  textDecoration: "none",
                  transition: "color 0.3s ease, borderColor 0.3s ease, letterSpacing 0.3s ease",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.color = "#7FB2D1";
                  el.style.borderBottomColor = "#7FB2D1";
                  el.style.letterSpacing = "0.35em";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.color = "#ffffff";
                  el.style.borderBottomColor = "rgba(255,255,255,0.4)";
                  el.style.letterSpacing = "0.25em";
                }}
              >
                Meet the Artists
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <div
        className="absolute bottom-16 z-20 w-full md:bottom-20"
        style={{
          paddingLeft: "clamp(24px, 6vw, 96px)",
          paddingRight: isTablet ? "clamp(20px, 5vw, 72px)" : "clamp(24px, 6vw, 96px)",
        }}
      >
        <div className="flex justify-end">
          <motion.span
            key={activeImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
              color: "#fcf8ea",
              fontFamily: '"Onest", sans-serif',
              fontSize: "1.3rem",
              lineHeight: 1,
            }}
          >
            {heroArtists[activeImageIndex]}
          </motion.span>
        </div>
      </div>

      <div
        className="absolute bottom-6 z-20 w-full md:bottom-8"
        style={{
          paddingLeft: "clamp(24px, 6vw, 96px)",
          paddingRight: "clamp(24px, 6vw, 96px)",
        }}
      >
        <div className="flex items-center gap-5">
          <button
            onClick={handlePlayPause}
            aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            className="flex h-8 w-8 items-center justify-center"
            style={{ color: "#fcf8ea" }}
          >
            {isPlaying ? (
              <span className="flex items-center gap-[5px]">
                <span className="h-4 w-[2px] bg-background" />
                <span className="h-4 w-[2px] bg-background" />
              </span>
            ) : (
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  borderLeft: "12px solid #fcf8ea",
                  marginLeft: "2px",
                }}
              />
            )}
          </button>

          <div className="flex flex-1 items-center gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                className="relative h-[3px] flex-1 overflow-hidden"
                style={{ backgroundColor: "rgba(252,248,234,0.25)" }}
              >
                {index < activeImageIndex && (
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{ width: "100%", backgroundColor: "hsl(var(--background))" }}
                  />
                )}
                {index === activeImageIndex && (
                  <span
                    key={`${activeImageIndex}-${progressRunId}`}
                    ref={progressBarRef}
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: "0%",
                      backgroundColor: "hsl(var(--background))",
                      animation: `hero-progress-fill ${SLIDE_DURATION}ms linear forwards`,
                      animationPlayState: isPlaying ? "running" : "paused",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="ml-3 flex items-center gap-4">
            <span
              className="font-display text-[11px] uppercase tracking-[0.14em]"
              style={{ color: "rgba(252,248,234,0.6)" }}
            >
              {activeImageIndex + 1} / {heroImages.length}
            </span>
            <div className="flex items-center gap-2 text-[#fcf8ea]">
              <button onClick={goToPrev} aria-label="Previous slide" className="text-lg leading-none">
                ←
              </button>
              <button onClick={goToNext} aria-label="Next slide" className="text-lg leading-none">
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hero-progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}
