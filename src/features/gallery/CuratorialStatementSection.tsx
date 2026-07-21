export function CuratorialStatementSection() {
  return (
    <section className="relative bg-background px-6 py-24 md:px-12 md:py-32 lg:px-24 2xl:py-40">
      <img
        src="/assets/BRIDGEARG - Exportacion logos - PNG-19.png"
        alt=""
        className="pointer-events-none absolute left-4 top-4 z-10 w-16 object-contain opacity-10 md:w-20 xl:w-[100px]"
      />
      <img
        src="/assets/BRIDGEARG - Exportacion logos - PNG-19.png"
        alt=""
        className="pointer-events-none absolute right-4 top-4 z-10 w-16 object-contain opacity-10 md:w-20 xl:w-[100px]"
        style={{ transform: "scaleX(-1)" }}
      />
      <img
        src="/assets/BRIDGEARG - Exportacion logos - PNG-19.png"
        alt=""
        className="pointer-events-none absolute bottom-4 left-4 z-10 w-16 object-contain opacity-10 md:w-20 xl:w-[100px]"
        style={{ transform: "scaleY(-1)" }}
      />
      <img
        src="/assets/BRIDGEARG - Exportacion logos - PNG-19.png"
        alt=""
        className="pointer-events-none absolute bottom-4 right-4 z-10 w-16 object-contain opacity-10 md:w-20 xl:w-[100px]"
        style={{ transform: "scale(-1)" }}
      />
      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-center text-center">
        <p className="max-w-5xl font-display text-2xl font-bold leading-[1.45] tracking-[0.03em] text-[#1e1517] sm:text-3xl lg:text-4xl 2xl:text-5xl">
          BridgeArg was created to connect
          Argentine artists with collectors abroad. <br />
          A bridge between cultures, stories and contemporary voices.
        </p>
        <img
          src="/assets/BRIDGEARG - Exportacion logos - PNG-20.png"
          className="mx-auto mt-8 h-5 object-contain opacity-60 md:mt-10 md:h-6"
          alt="bridge-separator"
        />
      </div>
    </section>
  );
}
