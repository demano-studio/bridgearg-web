import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { images } from "@/lib/images";
import { useIsMobile } from "@/hooks/use-mobile";

const image2Src = images.fotoCarmela;

export function BridgeNetworkSection() {
  const isMobile = useIsMobile();
  const attrs = ["Culture", "Quality", "Transparency", "Warmth", "Transcendence", "Closeness"];

  return (
    <section className="bg-[#1e1517] px-6 py-24 md:px-12 md:py-32 lg:px-24">
      <div className="mx-auto grid max-w-[1800px] grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "14px" : "24px" }}>
            <img
              src="/assets/logos/BRIDGEARG - Exportacion logos-09.svg"
              alt="BridgeArg"
              style={{ width: "clamp(80px, 11vw, 160px)", height: "clamp(80px, 11vw, 160px)", flexShrink: 0 }}
            />
            <h2
              className="font-display leading-[1.1] tracking-[-0.02em]"
              style={{ fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 700, color: "#ffffff" }}
            >
              We are a bridge.
              <br />
              We are a{" "}
              <span
                style={{
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontWeight: 400,
                  fontSize: "1.12em",
                  display: "inline",
                  color: "#7fb2d1",
                }}
              >
                network.
              </span>
            </h2>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        >
          <p className="font-display text-base leading-relaxed md:text-lg" style={{ color: "rgba(255,255,255,0.75)" }}>
            We exist because we deeply believe in Argentine talent — that mix of creativity, craft, design, and
            that certain something the world recognizes even if it can't name it.
          </p>
          <p className="mt-4 font-display text-base leading-relaxed md:text-lg" style={{ color: "rgba(255,255,255,0.75)" }}>
            BridgeArg provides a professional and legal framework to work with clients in the United States,
            handling foreign trade, documentation, shipping, and everything needed for each piece to travel safely.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {attrs.map((attr) => (
              <span
                key={attr}
                className="font-display text-[11px] uppercase tracking-[1.5px] border px-3.5 py-1.5"
                style={{ border: "1px solid #7fb2d1", color: "#7fb2d1", background: "transparent" }}
              >
                {attr}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function CuratorSection() {
  return (
    <section
      id="curator"
      className="curator-section px-6 md:px-12 lg:px-24"
      style={{ scrollMarginTop: "calc(var(--header-h, 80px) + 16px)" }}
    >
      <div className="curator-section__wrap mx-auto max-w-[1800px]">
        <div className="curator-section__grid">
          <div className="curator-section__text">
            <p className="curator-section__eyebrow">(Curatorial direction)</p>
            <h2 className="curator-section__title">Curatorial Management and Visual Arts.</h2>
            <blockquote className="curator-section__quote">
              "To understand art as a space of absolute freedom, an invisible bridge connecting the
              artist's sensibility with the viewer's gaze."
            </blockquote>
            <p className="curator-section__name">Carmela Gastaldi</p>
            <p className="curator-section__role">Curatorial Director</p>
            <p className="curator-section__bio">
              Carmela Gastaldi (Córdoba, 1959), a cultural manager and visual artist with a diverse
              background encompassing painting, restoration, and watercolor, found in the visual arts a territory of freedom and constant exploration.
              Her sharp aesthetic criteria ensure her
              strong presence in the local scene; the artists on her platform unanimously describe her
              as a highly talented professional with a profound knowledge of her craft, unanimously
              highlighting her objectivity, transparency, and honesty. For over a decade, she has
              dedicated herself to this role, working across various institutions. Balancing
              management and studio work, Carmela drives art as a vital and transformative dialogue.
            </p>
            <Link to="/nosotros" className="curator-section__link">
              Learn more about us →
            </Link>
          </div>

          <div className="curator-section__portrait-outer">
            <div className="curator-section__portrait">
              <img src={image2Src} alt="Carmela Gastaldi" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .curator-section {
          background: var(--color-bg, #fcf8ea);
          padding-top: 120px;
          padding-bottom: 120px;
          text-align: left;
        }
        .curator-section__wrap {
          width: 100%;
        }
        .curator-section__grid {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 80px;
          align-items: center;
        }
        .curator-section__text {
          min-width: 0;
        }
        .curator-section__eyebrow {
          margin: 0;
          font-family: "Onest", sans-serif;
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5f5659;
        }
        .curator-section__title {
          margin: 20px 0 0;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: 60px;
          line-height: 1.04;
          letter-spacing: -0.015em;
          color: #1e1517;
          text-wrap: balance;
        }
        .curator-section__quote {
          margin: 44px 0 0;
          padding: 36px 0 0;
          max-width: 640px;
          border: none;
          border-top: 1px solid rgba(30, 21, 23, 0.4);
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: 30px;
          line-height: 1.3;
          color: #1e1517;
        }
        .curator-section__name {
          margin: 36px 0 0;
          font-family: "Onest", sans-serif;
          font-weight: 500;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #1e1517;
        }
        .curator-section__role {
          margin: 6px 0 0;
          font-family: "Onest", sans-serif;
          font-weight: 400;
          font-size: 13px;
          letter-spacing: 0.14em;
          color: rgba(30, 21, 23, 0.8);
        }
        .curator-section__bio {
          margin: 28px 0 0;
          max-width: 640px;
          font-family: "Onest", sans-serif;
          font-weight: 300;
          font-size: 16px;
          line-height: 1.65;
          color: rgba(30, 21, 23, 0.8);
        }
        .curator-section__link {
          display: inline-flex;
          align-items: center;
          margin-top: 36px;
          min-height: 44px;
          padding-bottom: 4px;
          font-family: "Onest", sans-serif;
          font-weight: 400;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-decoration: none;
          color: #1e1517;
          border-bottom: 1px solid rgba(30, 21, 23, 0.4);
          transition: color 0.3s ease, border-color 0.3s ease;
        }
        .curator-section__link:hover {
          color: #7fb2d1;
          border-bottom-color: #7fb2d1;
        }
        .curator-section__portrait-outer {
          width: 100%;
          max-width: 100%;
          padding: 14px;
          background: #7fb2d1;
          border-radius: 999px 999px 0 0;
          box-sizing: border-box;
        }
        .curator-section__portrait {
          position: relative;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          border-radius: 999px 999px 0 0;
          background: var(--color-surface, #fcfcfc);
        }
        .curator-section__portrait img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 18%;
          display: block;
        }
        @media (max-width: 1000px) {
          .curator-section {
            padding-top: 88px;
            padding-bottom: 88px;
          }
          .curator-section__grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .curator-section__portrait-outer {
            order: -1;
            max-width: 320px;
            width: 100%;
            justify-self: center;
          }
          .curator-section__title {
            font-size: 46px;
          }
          .curator-section__quote {
            font-size: 24px;
            margin-top: 32px;
            padding-top: 28px;
          }
        }
        @media (max-width: 560px) {
          .curator-section {
            padding-top: 64px;
            padding-bottom: 64px;
          }
          .curator-section__title {
            font-size: 36px;
          }
        }
      `}</style>
    </section>
  );
}

/** @deprecated Prefer BridgeNetworkSection + CuratorSection for home composition. */
export function BrandStorySection() {
  return (
    <>
      <BridgeNetworkSection />
      <CuratorSection />
    </>
  );
}
