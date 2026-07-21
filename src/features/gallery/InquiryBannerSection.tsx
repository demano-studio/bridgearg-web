import { Link } from "react-router-dom";

const bridgeSealSrc = "/assets/logos/bridgearg-logo-light.svg";

export function InquiryBannerSection() {
  return (
    <section className="bg-[#1e1517] px-6 py-20 md:px-12 md:py-24 lg:px-24 2xl:py-28">
      <div className="mx-auto max-w-[1440px] text-center">
        <img
          src={bridgeSealSrc}
          alt=""
          className="mx-auto block object-contain opacity-80"
          style={{ width: "clamp(48px, 8vw, 100px)", height: "auto" }} // TAMAÑO DEL SELLO (fluid: 48px en mobile → 100px en desktop)
        />

        <h2 className="mt-8 font-display text-3xl font-medium tracking-tight text-[#fcf8ea] sm:text-4xl lg:text-5xl 2xl:text-6xl">
          Looking for a specific piece or a private commission?
        </h2>

        <p className="mx-auto mt-4 max-w-2xl font-display text-sm text-[#fcf8ea]/70 md:text-base 2xl:text-lg">
          Our curators are available for private consultations.
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            to="/contacto"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#fcf8ea] px-7 font-display text-xs font-medium uppercase tracking-[0.1em] text-[#fcf8ea] transition-all duration-300 hover:bg-background hover:text-[#1e1517] 2xl:h-14 2xl:px-8 2xl:text-sm"
          >
            Contact Curator
          </Link>
        </div>
      </div>
    </section>
  );
}
