import { useEffect, useState } from "react";
import { getAvailableCount } from "@/lib/api";

export function HeroSection() {
  const [availableCount, setAvailableCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    getAvailableCount()
      .then((count) => {
        if (!cancelled) setAvailableCount(count);
      })
      .catch(() => {
        if (!cancelled) setAvailableCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "calc(100svh - var(--header-h))" }}
    >
      <div className="absolute inset-0 z-10 bg-[#1e1517]/80" />

      <div
        className="relative z-20 mx-auto flex max-w-[1800px] items-center justify-center px-6 py-12 md:px-12 lg:px-24"
        style={{ minHeight: "calc(100svh - var(--header-h))" }}
      >
        <div className="flex w-full max-w-3xl flex-col gap-y-3 text-center md:gap-y-4">
          <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-white md:text-base 2xl:text-lg">
            BATCH #1: LIMITED VAULT
          </p>
          <p className="font-display text-7xl font-extralight leading-none tracking-tighter text-white sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] 2xl:text-[14rem]">
            {availableCount}
          </p>
          <p className="font-display text-lg font-light uppercase tracking-[0.18em] text-white md:text-xl xl:text-2xl 2xl:text-3xl">
            WORKS STILL AVAILABLE
          </p>
        </div>
      </div>
    </section>
  );
}
