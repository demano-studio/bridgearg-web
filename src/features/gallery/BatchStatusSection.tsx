const services = [
  {
    n: "01",
    label: "Certified",
    title: "Provenance & Authenticity",
    description:
      "Every physical masterpiece is accompanied by a Certificate of Authenticity hand-signed by the artist. We guarantee the provenance and unique identity of each work.",
  },
  {
    n: "02",
    label: "White-glove",
    title: "Specialized Art Handling",
    description:
      "Global white-glove shipping. Our logistics partners specialize in fine art, ensuring your acquisition travels in museum-grade packaging and climate-controlled environments.",
  },
  {
    n: "03",
    label: "Direct access",
    title: "Private Consultation",
    description:
      "Direct access to our curators. We provide personalized advice on framing, lighting, and placement to ensure the artwork integrates perfectly into your private space.",
  },
];

export function BatchStatusSection() {
  return (
    <section
      id="collector-services"
      className="collector-services-section border-t border-[rgba(30,21,23,0.14)] px-6 md:px-12 lg:px-24"
    >
      <div className="collector-services-section__wrap mx-auto max-w-[1800px]">
        <header className="collector-services-section__head">
          <div className="collector-services-section__head-copy">
            <p className="collector-services-section__eyebrow">(Collector services)</p>
            <h2 className="collector-services-section__title">
              Confidence beyond the acquisition
            </h2>
          </div>
          <svg
            className="collector-services-section__arch-strip"
            width="200"
            height="51"
            viewBox="0 0 362 93"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <g transform="translate(0 93) scale(1 -1)">
              <path
                d="M0 0H362V19A69 74 0 0 0 293 93H257A74 74 0 0 0 109 93H73A73 74 0 0 0 0 19Z"
                stroke="#1e1517"
                strokeWidth="1.5"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
        </header>

        <div className="collector-services-section__grid">
          {services.map((service) => (
            <article key={service.title} className="collector-services-section__item">
              <div className="collector-services-section__meta">
                <div className="collector-services-section__arch" aria-hidden="true">
                  <span>{service.n}</span>
                </div>
                <span className="collector-services-section__label">{service.label}</span>
              </div>
              <h3 className="collector-services-section__name">{service.title}</h3>
              <p className="collector-services-section__description">{service.description}</p>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .collector-services-section {
          background: #fcf8ea;
          padding-top: 128px;
          padding-bottom: 136px;
          text-align: left;
        }
        .collector-services-section__wrap {
          width: 100%;
        }
        .collector-services-section__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 40px;
          margin-bottom: 80px;
        }
        .collector-services-section__head-copy {
          min-width: 0;
          flex: 1;
        }
        .collector-services-section__eyebrow {
          margin: 0;
          font-family: "Onest", sans-serif;
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5f5659;
        }
        .collector-services-section__title {
          margin: 20px 0 0;
          max-width: 760px;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: 72px;
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: #1e1517;
          text-wrap: balance;
        }
        .collector-services-section__arch-strip {
          flex-shrink: 0;
          display: block;
          width: 200px;
          height: auto;
        }
        .collector-services-section__grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid #1e1517;
        }
        .collector-services-section__item {
          min-width: 0;
          padding: 48px 40px 0;
          text-align: left;
        }
        .collector-services-section__item:first-child {
          padding-left: 0;
        }
        .collector-services-section__item:last-child {
          padding-right: 0;
        }
        .collector-services-section__item:nth-child(n + 2) {
          border-left: 1px solid rgba(30, 21, 23, 0.2);
        }
        .collector-services-section__meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
        }
        .collector-services-section__arch {
          width: 72px;
          height: 92px;
          box-sizing: border-box;
          border: none;
          border-radius: 999px 999px 0 0;
          background: #7fb2d1;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 14px;
          flex-shrink: 0;
        }
        .collector-services-section__arch span {
          font-family: "Onest", sans-serif;
          font-weight: 400;
          font-size: 26px;
          line-height: 1;
          letter-spacing: 0.04em;
          color: #1e1517;
        }
        .collector-services-section__label {
          font-family: "Onest", sans-serif;
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #5f5659;
          text-align: right;
        }
        .collector-services-section__name {
          margin: 36px 0 0;
          font-family: "Onest", sans-serif;
          font-weight: 400;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.012em;
          color: #1e1517;
        }
        .collector-services-section__description {
          margin: 16px 0 0;
          max-width: 390px;
          font-family: "Onest", sans-serif;
          font-weight: 400;
          font-size: 17px;
          line-height: 1.6;
          color: #5f5659;
        }
        @media (max-width: 1000px) {
          .collector-services-section {
            padding-top: 88px;
            padding-bottom: 96px;
            padding-left: 28px;
            padding-right: 28px;
          }
          .collector-services-section__head {
            flex-direction: column;
            align-items: flex-start;
            gap: 28px;
            margin-bottom: 56px;
          }
          .collector-services-section__title {
            font-size: 52px;
          }
          .collector-services-section__arch-strip {
            display: none;
          }
          .collector-services-section__grid {
            grid-template-columns: 1fr;
          }
          .collector-services-section__item,
          .collector-services-section__item:first-child,
          .collector-services-section__item:last-child {
            padding: 36px 0 40px;
          }
          .collector-services-section__item:nth-child(n + 2) {
            border-left: none;
            border-top: 1px solid rgba(30, 21, 23, 0.2);
          }
          .collector-services-section__name {
            margin-top: 28px;
          }
        }
        @media (max-width: 560px) {
          .collector-services-section {
            padding-top: 64px;
            padding-bottom: 72px;
            padding-left: 20px;
            padding-right: 20px;
          }
          .collector-services-section__title {
            font-size: 38px;
          }
          .collector-services-section__arch {
            width: 60px;
            height: 78px;
          }
          .collector-services-section__arch span {
            font-size: 22px;
          }
          .collector-services-section__name {
            font-size: 24px;
          }
          .collector-services-section__description {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  );
}
