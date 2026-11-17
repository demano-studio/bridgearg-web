import { Link } from "react-router-dom";

const BENEFITS = [
  {
    n: "01",
    title: "Trade pricing",
    body: "A preferred rate on every acquisition for registered designers.",
  },
  {
    n: "02",
    title: "Holds while you present",
    body: "We reserve the piece while your client decides.",
  },
  {
    n: "03",
    title: "White-glove delivery",
    body: "Crated, shipped, cleared through customs and placed.",
  },
];

export function TradeInSituSection() {
  return (
    <section
      id="trade-home"
      className="trade-insitu-section bg-background px-6 md:px-12 lg:px-24"
      style={{ scrollMarginTop: "calc(var(--header-h, 80px) + 16px)" }}
    >
      <div className="trade-insitu-section__wrap mx-auto max-w-[1800px]">
        <figure className="trade-insitu-section__photo">
          <img
            src="/assets/home-studio/ernesto-in-situ.jpg"
            alt="Ernesto, a sculpture by Alejandra Espinosa, on a stone plinth in a bright concrete room"
            width={896}
            height={1200}
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            Alejandra Espinosa · <i>Ernesto</i>, in situ
          </figcaption>
        </figure>

        <div className="trade-insitu-section__copy">
          <p className="trade-insitu-section__eyebrow">For interior designers and advisors</p>
          <h2 className="trade-insitu-section__title">Art that is ready for your project</h2>
          <ul className="trade-insitu-section__list">
            {BENEFITS.map((item) => (
              <li key={item.n}>
                <i>{item.n}</i>
                <div>
                  <b>{item.title}</b>
                  <span>{item.body}</span>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/trade" className="trade-insitu-section__btn">
            Join the Trade Program
          </Link>
        </div>
      </div>

      <style>{`
        .trade-insitu-section {
          padding-block: clamp(64px, 9vw, 128px);
          padding-bottom: max(clamp(64px, 9vw, 128px), calc(env(safe-area-inset-bottom, 0px) + 5.5rem));
        }
        .trade-insitu-section__wrap {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
          gap: clamp(28px, 5vw, 88px);
          align-items: center;
        }
        .trade-insitu-section__photo {
          position: relative;
          margin: 0;
        }
        .trade-insitu-section__photo img {
          width: 100%;
          aspect-ratio: 4 / 5;
          max-height: 78vh;
          object-fit: cover;
          display: block;
        }
        .trade-insitu-section__photo figcaption {
          position: absolute;
          left: 16px;
          bottom: 16px;
          background: var(--color-bg, #fcf8ea);
          padding: 8px 12px;
          font-family: "Onest", sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: #1e1517;
          max-width: calc(100% - 32px);
        }
        .trade-insitu-section__photo figcaption i {
          font-style: italic;
        }
        .trade-insitu-section__eyebrow {
          margin: 0;
          font-family: "Onest", sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 400;
          color: #1e1517;
        }
        .trade-insitu-section__title {
          margin: 14px 0 22px;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: clamp(30px, 3.4vw, 50px);
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: #1e1517;
          text-wrap: balance;
        }
        .trade-insitu-section__list {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          border-top: 1px solid rgba(30, 21, 23, 0.14);
        }
        .trade-insitu-section__list li {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 8px;
          padding: 16px 0;
          border-bottom: 1px solid rgba(30, 21, 23, 0.14);
        }
        .trade-insitu-section__list i {
          font-style: normal;
          color: #4a7fa0;
          font-size: 13px;
          padding-top: 2px;
          font-family: "Onest", sans-serif;
        }
        .trade-insitu-section__list b {
          font-weight: 400;
          display: block;
          font-family: "Onest", sans-serif;
          color: #1e1517;
          font-size: 16px;
        }
        .trade-insitu-section__list span {
          color: #6b6365;
          font-size: 14px;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          line-height: 1.5;
        }
        .trade-insitu-section__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 14px 24px;
          border-radius: var(--radius-button, 9999px);
          overflow: hidden;
          font-family: "Onest", sans-serif;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 400;
          text-decoration: none;
          border: 1px solid #1e1517;
          background: #1e1517;
          color: #fcf8ea;
          transition: background 0.3s, color 0.3s;
        }
        .trade-insitu-section__btn:hover {
          background: transparent;
          color: #1e1517;
        }
        @media (max-width: 860px) {
          .trade-insitu-section__wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
