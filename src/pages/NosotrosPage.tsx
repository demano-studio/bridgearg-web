import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { getArtists, getWorks } from "@/lib/api";
import { images } from "@/lib/images";
import { SEO } from "@/components/SEO";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: "rgba(30,21,23,0.62)",
  marginBottom: "34px",
  fontFamily: '"Onest", sans-serif',
};

const displayLineStyle: CSSProperties = {
  fontFamily: '"Onest", sans-serif',
  fontSize: "clamp(42px, 5vw, 82px)",
  lineHeight: 1.02,
  letterSpacing: "-0.055em",
  maxWidth: "650px",
  fontWeight: 500,
  color: "#1e1517",
};

const NosotrosPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { data: artists = [] } = useQuery({ queryKey: ["artists"], queryFn: getArtists });
  const { data: works = [] } = useQuery({ queryKey: ["works"], queryFn: () => getWorks() });

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="About"
          description="Learn about BridgeArg, the gallery connecting Argentine contemporary art with global collectors."
          url="/about"
        />
        <Header />
        <main>
          {/* 1. Hero */}
          <section
            className="relative grid"
            style={{
              minHeight: isMobile ? "auto" : "100vh",
              paddingTop: "80px",
              alignItems: "end",
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              overflow: "hidden",
            }}
          >
            <div
              className="absolute max-[949px]:opacity-[0.38] max-[949px]:[clip-path:none] max-[949px]:[inset:50%_0_0_0] min-[950px]:opacity-100 min-[950px]:[inset:80px_0_0_52%] min-[950px]:[clip-path:polygon(9%_0,100%_0,100%_100%,0_100%)]"
              style={{
                backgroundImage: `linear-gradient(90deg, #fcf8ea 0%, rgba(252,248,234,0.18) 38%, rgba(30,21,23,0.18) 100%), url('${images.theProcess}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "saturate(0.82) contrast(1.04)",
              }}
              aria-hidden
            />
            <div
              className="hero-copy relative z-[3]"
              style={{
                padding: isMobile ? "40px 20px 50px" : "12vh clamp(24px, 7vw, 120px) 14vh",
                maxWidth: "760px",
              }}
            >
              <p style={eyebrowStyle}>About Us</p>
              <h1
                style={{
                  fontSize: "clamp(72px, 10vw, 172px)",
                  ...(isMobile ? { fontSize: "56px" } : {}),
                  lineHeight: 0.86,
                  letterSpacing: "-0.085em",
                  fontWeight: 800,
                  maxWidth: "900px",
                  marginBottom: "42px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                <span style={{ display: "block", color: "#1e1517" }}>We are a</span>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: '"BestDB", "Caveat", cursive',
                    fontWeight: 400,
                    color: "#7FB2D1",
                    transform: "rotate(-7deg)",
                    transformOrigin: "left center",
                  }}
                >
                  Bridge.
                </span>
              </h1>
              <p
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(25px, 3vw, 48px)",
                  ...(isMobile ? { fontSize: "28px" } : {}),
                  lineHeight: 1.05,
                  maxWidth: "770px",
                  color: "#1e1517",
                  marginBottom: "34px",
                  fontWeight: 400,
                }}
              >
                Between Argentine creation and the collectors who can carry it further.
              </p>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: 1.8,
                  color: "rgba(30,21,23,0.62)",
                  maxWidth: "620px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                BridgeArg exists to help contemporary Argentine artists cross borders with clarity,
                care and professional structure — connecting Cordoba, Plantation, FL and every shore
                in between.
              </p>
            </div>
          </section>

          {/* 2. Stats */}
          <section
            className="grid max-[949px]:grid-cols-1 min-[950px]:grid-cols-2"
            style={{
              borderBottom: "1px solid rgba(30,21,23,0.16)",
              minHeight: "170px",
            }}
          >
            <div
              className="flex flex-col items-center justify-center max-[949px]:border-b max-[949px]:border-[rgba(30,21,23,0.16)] min-[950px]:border-r min-[950px]:border-[rgba(30,21,23,0.16)]"
              style={{ gap: "12px" }}
            >
              <strong
                style={{
                  fontSize: "40px",
                  letterSpacing: "-0.04em",
                  fontWeight: 600,
                  fontFamily: '"Onest", sans-serif',
                  color: "#1e1517",
                }}
              >
                {works.length}
              </strong>
              <span
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  color: "rgba(30,21,23,0.62)",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Curated works
              </span>
            </div>
            <div
              className="flex flex-col items-center justify-center min-[950px]:border-0"
              style={{ gap: "12px" }}
            >
              <strong
                style={{
                  fontSize: "40px",
                  letterSpacing: "-0.04em",
                  fontWeight: 600,
                  fontFamily: '"Onest", sans-serif',
                  color: "#1e1517",
                }}
              >
                {artists.length}
              </strong>
              <span
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  color: "rgba(30,21,23,0.62)",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Artists
              </span>
            </div>
          </section>

          {/* 3. Curation */}
          <section style={{ padding: isMobile ? "50px 20px" : "135px clamp(24px, 7vw, 120px)", borderBottom: "1px solid rgba(30,21,23,0.16)" }}>
            <div
              className="grid max-[949px]:grid-cols-1 max-[949px]:p-8 min-[950px]:grid-cols-[0.8fr_1.2fr] min-[950px]:items-center min-[950px]:p-[70px]"
              style={{
                border: "1px solid rgba(30,21,23,0.16)",
                gap: isMobile ? "28px" : "70px",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.16)",
              }}
            >
              <div
                className="grid max-[949px]:grid-cols-1 min-[950px]:grid-cols-2"
                style={{ gap: "16px" }}
              >
                <div
                  style={{
                    height: "250px",
                    overflow: "hidden",
                    borderRadius: "50% 50% 0 0",
                    backgroundImage: `url('${images.fondoCaro}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "saturate(0.82) contrast(1.02)",
                  }}
                  aria-hidden
                />
                <div
                  className="max-[949px]:mt-0 min-[950px]:mt-[70px]"
                  style={{
                    height: "250px",
                    overflow: "hidden",
                    borderRadius: "0 0 50% 50%",
                    backgroundImage: `url('${images.fondoMariano}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "saturate(0.82) contrast(1.02)",
                  }}
                  aria-hidden
                />
              </div>
              <div>
                <p style={eyebrowStyle}>Curatorial position</p>
                <p style={{ ...displayLineStyle, maxWidth: "720px" }}>BridgeArg is not an open marketplace.</p>
                <div style={{ marginTop: "34px", display: "grid", gap: "28px" }}>
                  <p
                    style={{
                      fontSize: "18px",
                      lineHeight: 1.75,
                      color: "rgba(30,21,23,0.62)",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Every artist is selected for their trajectory, identity, consistency and ability to
                    sustain a professional international relationship.
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
                      lineHeight: 1.75,
                      color: "rgba(30,21,23,0.62)",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    This curation allows collectors to discover works with cultural value, while artists
                    become part of a platform designed to represent them with seriousness and care.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Why */}
          <section style={{ padding: isMobile ? "50px 20px" : "130px clamp(24px, 7vw, 120px)", borderBottom: "1px solid rgba(30,21,23,0.16)" }}>
            <div
              className="grid max-[949px]:grid-cols-1 min-[950px]:grid-cols-[0.9fr_1.1fr] min-[950px]:items-start"
              style={{ gap: isMobile ? "24px" : "90px", alignItems: "start" }}
            >
              <div>
                <p style={{ ...eyebrowStyle, marginBottom: "34px" }}>Why BridgeArg exists</p>
                <p style={{ ...displayLineStyle, maxWidth: "650px" }}>
                  Argentine art has always carried identity, craft and cultural depth.
                </p>
                <p
                  style={{
                    fontFamily: '"BestDB", "Caveat", cursive',
                    fontStyle: "italic",
                    fontSize: "clamp(28px, 3vw, 36px)",
                    color: "#7FB2D1",
                    marginTop: "18px",
                    transform: "rotate(-4deg)",
                    display: "inline-block",
                  }}
                >
                  Made to cross bridges.
                </p>
              </div>
              <div style={{ display: "grid", gap: "28px", maxWidth: "720px" }}>
                <p
                  style={{
                    fontSize: "18px",
                    lineHeight: 1.75,
                    color: "rgba(30,21,23,0.62)",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  But international access has often depended on fragmented systems, complex logistics
                  and isolated opportunities.
                </p>
                <p
                  style={{
                    fontSize: "18px",
                    lineHeight: 1.75,
                    color: "rgba(30,21,23,0.62)",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  BridgeArg was created to become the structure behind the crossing: a platform that
                  gives artists visibility, gives collectors confidence, and gives each work the
                  professional path it deserves.
                </p>
                <p
                  style={{
                    fontSize: "18px",
                    lineHeight: 1.75,
                    color: "rgba(30,21,23,0.62)",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  We do not simply move pieces from one place to another. We protect the story, the
                  material, the origin and the value carried inside each work.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Bridge map */}
          <section style={{ padding: isMobile ? "50px 20px" : "120px clamp(24px, 7vw, 120px)", borderBottom: "1px solid rgba(30,21,23,0.16)", overflow: "hidden" }}>
            <p style={eyebrowStyle}>The Bridge</p>
            <p style={{ ...displayLineStyle, maxWidth: "800px" }}>
              A cultural route built with care, trust and precision.
            </p>
            <div style={{ position: "relative", margin: "70px 0 42px", height: "1px", backgroundColor: "#1e1517" }}>
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  transform: "translate(-50%, -50%)",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: "#1e1517",
                }}
                aria-hidden
              />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: "#7FB2D1",
                }}
                aria-hidden
              />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "100%",
                  transform: "translate(-50%, -50%)",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: "#1e1517",
                }}
                aria-hidden
              />
            </div>
            <div
              className="grid max-[949px]:grid-cols-1 min-[950px]:grid-cols-3"
              style={{ gap: "20px", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)" }}
            >
              {[
                {
                  small: "Origin",
                  h: "Argentina",
                  p: "Artists, studios, materials, craft and local identity.",
                },
                {
                  small: "BridgeArg",
                  h: "Structure",
                  p: "Curation, communication, documentation, logistics and professional support.",
                },
                {
                  small: "Destination",
                  h: "Collectors",
                  p: "International buyers who seek pieces with depth, story and authenticity.",
                },
              ].map((city) => (
                <div
                  key={city.h}
                  style={{
                    border: "1px solid rgba(30,21,23,0.16)",
                    padding: "28px",
                    minHeight: "150px",
                    backgroundColor: "rgba(255,255,255,0.14)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      color: "rgba(30,21,23,0.62)",
                      marginBottom: "18px",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    {city.small}
                  </span>
                  <h3
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.04em",
                      marginBottom: "16px",
                      fontFamily: '"Onest", sans-serif',
                      fontWeight: 500,
                      color: "#1e1517",
                    }}
                  >
                    {city.h}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "rgba(30,21,23,0.62)",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    {city.p}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Dark — What we do */}
          <section
            style={{
              backgroundColor: "#1e1517",
              color: "#fcf8ea",
              padding: isMobile ? "50px 20px" : "130px clamp(24px, 7vw, 120px)",
              position: "relative",
              overflow: "hidden",
              backgroundImage:
                "radial-gradient(circle at 84% 22%, rgba(127,178,209,0.13), transparent 34%), linear-gradient(135deg, #1e1517 0%, #140e10 100%)",
            }}
          >
            <div
              className="grid max-[949px]:grid-cols-1 min-[950px]:grid-cols-2 min-[950px]:items-center"
              style={{ gap: isMobile ? "24px" : "80px", alignItems: "center" }}
            >
              <div>
                <p
                  style={{
                    ...eyebrowStyle,
                    color: "rgba(252,248,234,0.72)",
                    marginBottom: "34px",
                  }}
                >
                  What we do
                </p>
                <p
                  style={{
                    ...displayLineStyle,
                    color: "#fcf8ea",
                    maxWidth: "650px",
                  }}
                >
                  We build the invisible structure that lets artists focus on creating.
                </p>
                <p
                  style={{
                    marginTop: "30px",
                    color: "rgba(252,248,234,0.72)",
                    fontSize: "17px",
                    lineHeight: 1.8,
                    maxWidth: "620px",
                    fontFamily: '"Onest", sans-serif',
                  }}
                >
                  Behind every piece there is a silent system of selection, protection, export
                  coordination and collector care. BridgeArg manages the professional framework so the
                  artwork can travel with integrity.
                </p>
                <div
                  className="mt-11 grid grid-cols-1 gap-[14px] min-[950px]:grid-cols-2"
                >
                  {[
                    { n: "01", t: "Curated international visibility" },
                    { n: "02", t: "Collector communication and inquiry management" },
                    { n: "03", t: "Export documentation and legal coordination" },
                    { n: "04", t: "Protective packaging and door-to-door delivery" },
                  ].map((s) => (
                    <div
                      key={s.n}
                      className="transition duration-300 ease-out hover:-translate-y-[3px] hover:border-[rgba(127,178,209,0.58)] hover:bg-[rgba(127,178,209,0.08)]"
                      style={{
                        border: "1px solid rgba(252,248,234,0.16)",
                        padding: "22px",
                        minHeight: "130px",
                        backgroundColor: "rgba(252,248,234,0.055)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#7FB2D1",
                          fontSize: "11px",
                          letterSpacing: "0.24em",
                          marginBottom: "24px",
                          fontFamily: '"Onest", sans-serif',
                        }}
                      >
                        {s.n}
                      </span>
                      <p
                        style={{
                          fontSize: "15px",
                          lineHeight: 1.45,
                          color: "#fcf8ea",
                          fontFamily: '"Onest", sans-serif',
                        }}
                      >
                        {s.t}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="group relative h-[520px] min-[950px]:h-[620px]"
                style={{
                  borderRadius: "48% 48% 0 0",
                  overflow: "hidden",
                  border: "1px solid rgba(252,248,234,0.16)",
                  boxShadow: "0 36px 110px rgba(0,0,0,0.42)",
                }}
              >
                <img
                  src={images.theProcess}
                  alt="BridgeArg — process and logistics"
                  className="h-full w-full object-cover transition-[transform] duration-700 ease-out group-hover:scale-[1.04]"
                  style={{
                    filter: "saturate(0.78) brightness(0.82) contrast(1.08)",
                  }}
                />
              </div>
            </div>
          </section>

          {/* 7. Process */}
          <section style={{ padding: isMobile ? "50px 20px" : "130px clamp(24px, 7vw, 120px)", borderBottom: "1px solid rgba(30,21,23,0.16)" }}>
            <div
              className="mb-[70px] flex max-[949px]:block min-[950px]:items-end min-[950px]:justify-between"
              style={{ gap: isMobile ? "24px" : "60px", marginBottom: isMobile ? "36px" : "70px", alignItems: "end" }}
            >
              <div>
                <p style={eyebrowStyle}>Our process</p>
                <p style={{ ...displayLineStyle, maxWidth: "900px" }}>
                  From studio to collector, each crossing is handled with intention.
                </p>
              </div>
              <p
                className="max-[949px]:mt-7 min-[950px]:max-w-[500px]"
                style={{
                  fontSize: "17px",
                  lineHeight: 1.75,
                  color: "rgba(30,21,23,0.62)",
                  fontFamily: '"Onest", sans-serif',
                  maxWidth: "500px",
                }}
              >
                A simple process, carefully managed behind the scenes, so the experience remains clear
                for both artists and collectors.
              </p>
            </div>
            <div
              className="grid max-[559px]:grid-cols-1 min-[560px]:max-[949px]:grid-cols-2 min-[950px]:grid-cols-4"
              style={{
                borderTop: "1px solid rgba(30,21,23,0.16)",
                borderLeft: "1px solid rgba(30,21,23,0.16)",
              }}
            >
              {[
                {
                  s: "01",
                  t: "Curate",
                  p: "We select artists and works with a clear editorial and cultural perspective.",
                },
                {
                  s: "02",
                  t: "Present",
                  p: "We build a professional digital context where each piece can be understood and valued.",
                },
                {
                  s: "03",
                  t: "Protect",
                  p: "We coordinate packaging, documentation and export requirements with precision.",
                },
                {
                  s: "04",
                  t: "Connect",
                  p: "We support the relationship between artists, works and international collectors.",
                },
              ].map((step) => (
                <div
                  key={step.s}
                  className="flex flex-col justify-between transition duration-300 ease-out hover:-translate-y-[6px] hover:bg-white"
                  style={{
                    minHeight: isMobile ? "260px" : "360px",
                    padding: "26px",
                    borderRight: "1px solid rgba(30,21,23,0.16)",
                    borderBottom: "1px solid rgba(30,21,23,0.16)",
                    backgroundColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        letterSpacing: "0.24em",
                        color: "#7FB2D1",
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      {step.s}
                    </p>
                    <h3
                      style={{
                        fontSize: "30px",
                        letterSpacing: "-0.045em",
                        marginBottom: "16px",
                        fontFamily: '"Onest", sans-serif',
                        fontWeight: 500,
                        color: "#1e1517",
                      }}
                    >
                      {step.t}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "rgba(30,21,23,0.62)",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    {step.p}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Final CTA */}
          <section
            style={{
              minHeight: isMobile ? "auto" : "88vh",
              backgroundImage: `linear-gradient(rgba(30,21,23,0.34), rgba(30,21,23,0.72)), url('${images.boxes}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "#fcf8ea",
              display: "flex",
              alignItems: "center",
              textAlign: "center",
              padding: isMobile ? "50px 20px" : "clamp(60px, 12vh, 120px) clamp(24px, 7vw, 120px)",
            }}
          >
            <div style={{ width: "100%" }}>
              <h2
                style={{
                  fontSize: "clamp(54px, 8vw, 132px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.08em",
                  marginBottom: "38px",
                  fontFamily: '"Onest", sans-serif',
                  fontWeight: 700,
                  color: "#fcf8ea",
                }}
              >
                Art deserves to travel with integrity.
              </h2>
              <p
                style={{
                  margin: "0 auto",
                  fontSize: "17px",
                  lineHeight: 1.8,
                  color: "rgba(252,248,234,0.72)",
                  maxWidth: "650px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                We believe in Argentine talent, in the hands that create, and in the bridges that make
                new paths possible.
              </p>
              <p
                style={{
                  marginTop: "56px",
                  fontSize: "12px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#7FB2D1",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                BridgeArg · Cordoba — Plantation, FL
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default NosotrosPage;
