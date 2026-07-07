import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getArtists, type ArtistFromApi } from "@/lib/api";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

export function ArtistsSection() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [artists, setArtists] = useState<ArtistFromApi[]>([]);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    getArtists()
      .then((artistsData) => {
        if (cancelled) return;
        setArtists(artistsData);
      })
      .catch(() => {
        if (cancelled) return;
        setArtists([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (artists.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % artists.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [artists.length]);

  const getVisibleArtists = () => {
    const total = artists.length;
    if (total === 0) return [];
    if (total === 1) return [artists[0]];

    return [
      artists[index % total],
      artists[(index + 1) % total],
    ];
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-background px-6 py-20 md:px-12 lg:px-24 md:py-24 2xl:py-28"
      style={{ paddingTop: isMobile ? "56px" : undefined, paddingBottom: isMobile ? "56px" : undefined }}
    >
      <div className="mx-auto max-w-[1800px]">
        <div className="flex items-center justify-center gap-2 sm:gap-8 md:gap-14 xl:gap-20 2xl:gap-24" style={{ gap: isMobile ? "8px" : isTablet ? "18px" : undefined }}>
        <AnimatePresence mode="wait">
          {getVisibleArtists().map((artist, i) => {
            const showName = i === 0 || i === 1;

            return (
              <motion.div
                key={`${index}-${i}`}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex cursor-pointer flex-col items-center"
                onClick={() => navigate(`/artistas/${artist.slug}`)}
              >
                <div
                  className="aspect-square w-16 overflow-hidden border border-[#1e1517]/10 sm:w-28 md:w-48 lg:w-56 xl:w-60 2xl:w-64"
                >
                  <img
                    src={artist.imageUrl ?? ""}
                    alt={artist.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                {showName && (
                  <p className="mt-4 font-display text-[10px] uppercase tracking-[0.22em] text-[#1e1517] sm:mt-5 md:mt-6 md:text-xs 2xl:text-sm">
                    {artist.name}
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {artists.length > 1 && (
        <>
          <button
            onClick={() => setIndex((prev) => (prev - 1 + artists.length) % artists.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 text-base text-[#1e1517] md:left-6 md:text-2xl lg:left-10"
            aria-label="Previous artists"
          >
            ←
          </button>
          <button
            onClick={() => setIndex((prev) => (prev + 1) % artists.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-base text-[#1e1517] md:right-6 md:text-2xl lg:right-10"
            aria-label="Next artists"
          >
            →
          </button>
        </>
      )}
      </div>
    </section>
  );
}
