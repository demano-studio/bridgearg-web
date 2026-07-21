import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getWorks, type WorkFromApi } from "@/lib/api";

const masonryPatterns = [
  { span: "md:col-span-3", aspect: "aspect-[4/5]" },
  { span: "md:col-span-3", aspect: "aspect-[5/4]" },
  { span: "md:col-span-2", aspect: "aspect-[4/5]" },
  { span: "md:col-span-4", aspect: "aspect-[16/10]" },
  { span: "md:col-span-2", aspect: "aspect-[1/1]" },
  { span: "md:col-span-3", aspect: "aspect-[4/5]" },
  { span: "md:col-span-3", aspect: "aspect-[5/4]" },
];

type FilterMode = "all" | "available";

export function BatchCollectionSection() {
  const [works, setWorks] = useState<WorkFromApi[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    let cancelled = false;

    getWorks()
      .then((data) => {
        if (!cancelled) setWorks(data);
      })
      .catch(() => {
        if (!cancelled) setWorks([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredWorks = useMemo(() => {
    if (filterMode === "available") {
      return works.filter((work) => work.available);
    }

    return works;
  }, [filterMode, works]);

  return (
    <section className="bg-background px-6 pb-40 pt-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-8 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[0.12em] text-[#1e1517]/65 md:text-xs">
              Batch #1
            </p>
            <h2 className="mt-3 break-words font-display text-[clamp(2.25rem,10vw,8rem)] font-bold uppercase tracking-tight text-[#1e1517]">
              The Batch #1 Collection
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`h-11 rounded-full border px-5 font-display text-xs uppercase tracking-[0.1em] transition-colors ${
                filterMode === "all"
                  ? "border-[#1e1517] bg-[#1e1517] text-[#fcf8ea]"
                  : "border-[#1e1517]/20 bg-transparent text-[#1e1517]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("available")}
              className={`h-11 rounded-full border px-5 font-display text-xs uppercase tracking-[0.1em] transition-colors ${
                filterMode === "available"
                  ? "border-[#1e1517] bg-[#1e1517] text-[#fcf8ea]"
                  : "border-[#1e1517]/20 bg-transparent text-[#1e1517]"
              }`}
            >
              Available
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-6 md:gap-8 xl:gap-10">
          {filteredWorks.map((work, index) => {
            const pattern = masonryPatterns[index % masonryPatterns.length];
            const statusLabel = work.available ? "AVAILABLE" : work.status.toUpperCase();

            return (
              <Link
                key={work.id}
                to={`/artworks/${work.id}`}
                className={`group block ${pattern.span}`}
              >
                <article className="space-y-4">
                  <div className={`relative overflow-hidden bg-[rgba(30,21,23,0.04)] ${pattern.aspect}`}>
                    <OptimizedImage
                      src={work.imagenUrl}
                      title={work.title}
                      artistName={work.artistName}
                      variant="artwork"
                      className="h-full w-full"
                      imageClassName="!object-contain !object-center transition-[filter] duration-700 ease-out saturate-[0.86] contrast-[0.95] group-hover:saturate-100 group-hover:contrast-100"
                    />

                    <div className="absolute inset-0 bg-black/0 transition-all duration-500 ease-out group-hover:bg-black/60" />

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                      <p
                        className="font-display text-center text-3xl font-semibold tracking-tight text-[#ffffff] opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 md:text-4xl"
                      >
                        {work.artistName}
                      </p>
                    </div>

                    <div className="absolute left-4 top-4">
                      <span className="inline-flex items-center rounded-full border border-[#1e1517]/35 bg-background px-3 py-1 font-display text-[10px] uppercase tracking-[0.1em] text-[#1e1517]">
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 px-1">
                    <h3 className="font-display text-xl uppercase tracking-[0.06em] text-[#1e1517] md:text-2xl">
                      {work.title}
                    </h3>

                    <p className="font-display text-xs uppercase tracking-[0.08em] text-[#1e1517]/72 md:text-sm">
                      {work.artistName}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
