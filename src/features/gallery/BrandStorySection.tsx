import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { images } from "@/lib/images";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const image1Src = images.cuadroCarmela;
const image2Src = images.fotoCarmela;

export function BrandStorySection() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const attrs = ["Culture", "Quality", "Transparency", "Warmth", "Transcendence", "Closeness"];

  return (
    <>
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

      <section className="bg-background px-6 py-24 md:px-12 md:py-32 lg:px-24">
        <div className="mx-auto max-w-[1800px] space-y-32">

          {/* Block 1 — quote */}
          <motion.div
            className="flex flex-col"
            style={{
              paddingLeft: "clamp(0px, 5vw, 20px)",
              paddingRight: "clamp(0px, 5vw, 20px)",
              width: "100%",
              gap: isMobile ? "20px" : undefined,
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          >
            <div className="mx-auto w-full max-w-4xl">
              <div
                className="flex flex-col gap-4"
                style={{
                  position: "relative",
                  paddingLeft: "clamp(16px, 4vw, 56px)",
                  paddingTop: "16px",
                  paddingBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: '"Onest", sans-serif',
                    fontWeight: 600,
                    fontSize: "clamp(22px, 2.5vw, 32px)",
                  ...(isMobile ? { fontSize: "24px" } : {}),
                    color: "#7FB2D1",
                    display: "block",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.15,
                    marginTop: "25px",
                  }}
                >
                  Curatorial Management
                </span>
                <h3
                  className="font-display font-semibold text-[#1e1517] tracking-tight leading-tight"
                  style={{ fontSize: "clamp(22px,2.5vw,32px)" }}
                >
                  and Visual Arts.
                </h3>
                <p className="font-display text-base leading-relaxed text-[#1e1517]/80 md:text-lg">
                "To understand art as a space of absolute freedom, an invisible bridge connecting the
                artist's sensibility with the viewer's gaze."<br />
                </p>
                <p className="font-display text-base leading-relaxed text-[#1e1517]/80 md:text-lg">
                </p>
              </div>
            </div>
          </motion.div>

          {/* Block 2 — text left, image right */}
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-20">
            {/* Text left */}
            <motion.div
              className="flex flex-col gap-6 md:order-1"
              style={{ paddingLeft: "clamp(0px, 5vw, 20px)", paddingRight: "clamp(0px, 5vw, 20px)", width: "100%" }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            >
              <div
                className="flex flex-col gap-4"
                style={{
                  position: "relative",
                  paddingLeft: "clamp(16px, 4vw, 56px)",
                  paddingTop: "16px",
                  paddingBottom: "16px",
                }}
              >
                <h2
                  className="tracking-tight leading-tight text-[#1e1517]"
                  style={{
                    fontSize: "clamp(22px, 2.5vw, 32px)",
                    fontFamily: '"Onest", sans-serif',
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  <span style={{ display: "block" }}>Carmela Gastaldi</span>
                  <span
                    style={{
                      display: "inline-block",
                      fontFamily: '"Onest", sans-serif',
                      fontWeight: 600,
                      color: "#7FB2D1",
                      transformOrigin: "left center",
                    }}
                  >
                    Curatorial Director
                  </span>
                </h2>
                <p className="font-display text-base leading-relaxed text-[#1e1517]/80 md:text-lg">
                Carmela Gastaldi (Córdoba, 1959), a cultural manager and visual artist with a diverse
                background encompassing painting, restoration, and watercolor, found in the visual arts a territory of freedom and constant exploration.  
                Her sharp aesthetic criteria ensure her
                strong presence in the local scene; the artists on her platform unanimously describe her
                as a highly talented professional with a profound knowledge of her craft, unanimously
                highlighting her objectivity, transparency, and honesty. For over a decade, she has
                dedicated herself to this role, working across various institutions. Balancing
                management and studio work, Carmela drives art as a vital and transformative dialogue.
                </p>
              </div>
              <Link
                to="/nosotros"
                className="self-start border-b border-solid border-[rgba(30,21,23,0.4)] pb-[4px] text-[12px] uppercase tracking-[0.18em] text-[#1e1517] no-underline hover:border-[#7FB2D1] hover:text-[#7FB2D1] hover:tracking-[0.25em]"
                style={{
                  fontFamily: '"Onest", sans-serif',
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: isMobile ? "28px" : "clamp(40px, 6vh, 60px)",
                  transition: "color 0.3s ease, letter-spacing 0.3s ease, border-color 0.3s ease",
                }}
              >
                Learn more about us →
              </Link>
            </motion.div>

            {/* Image right */}
            <motion.div
              className="relative md:order-2"
              style={{ backgroundColor: "rgba(30,21,23,0.04)" }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <img src={image2Src} alt="" style={{ width: "100%", height: "auto", maxHeight: "clamp(380px, 50vw, 620px)", objectFit: "contain", borderRadius: "6px", display: "block" }} />
            </motion.div>
          </div>

        </div>
      </section>
    </>
  );
}

