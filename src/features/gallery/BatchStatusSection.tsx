import { useIsMobile } from "@/hooks/use-mobile";

const services = [
  {
    title: "Provenance & Authenticity",
    description:
      "Every physical masterpiece is accompanied by a Certificate of Authenticity hand-signed by the artist. We guarantee the provenance and unique identity of each work.",
  },
  {
    title: "Specialized Art Handling",
    description:
      "Global white-glove shipping. Our logistics partners specialize in fine art, ensuring your acquisition travels in museum-grade packaging and climate-controlled environments.",
  },
  {
    title: "Private Consultation",
    description:
      "Direct access to our curators. We provide personalized advice on framing, lighting, and placement to ensure the artwork integrates perfectly into your private space.",
  },
];

export function BatchStatusSection() {
  const isMobile = useIsMobile();

  return (
    <section
      className="collector-services-section"
      style={{
        background: "#FAF9EF",
        padding: isMobile ? "5rem 1.5rem" : "8rem 2.5rem",
        textAlign: "center",
      }}
    >
      <p className="collector-services-section__eyebrow">Collector Services</p>
      <h2 className="collector-services-section__title font-display">
        Confidence beyond the acquisition
      </h2>
      <div className="collector-services-section__grid">
        {services.map((service) => (
          <article key={service.title} className="collector-services-section__item">
            <h3 className="collector-services-section__name">{service.title}</h3>
            <div className="collector-services-section__divider" aria-hidden />
            <p className="collector-services-section__description">{service.description}</p>
          </article>
        ))}
      </div>
      <style>{`
        .collector-services-section__eyebrow {
          margin: 0 0 0.5rem;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-size: 11px;
          color: #7fb2d1;
          font-family: "Onest", sans-serif;
        }
        .collector-services-section__title {
          margin: 0 0 3rem;
          font-size: ${isMobile ? "1.6rem" : "2.6rem"};
          font-weight: 700;
          color: #100e0c;
          line-height: 1.2;
        }
        .collector-services-section__grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4rem;
        }
        .collector-services-section__item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .collector-services-section__name {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #100e0c;
          letter-spacing: 0.5px;
          line-height: 1.3;
          font-family: "Onest", sans-serif;
        }
        .collector-services-section__divider {
          width: 2.5rem;
          height: 1px;
          background: #7fb2d1;
          margin: 1.25rem auto;
        }
        .collector-services-section__description {
          margin: 0;
          font-size: 1rem;
          color: #8c8a82;
          line-height: 1.75;
          font-family: "Onest", sans-serif;
        }
        @media (max-width: 767px) {
          .collector-services-section__grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
        }
      `}</style>
    </section>
  );
}
