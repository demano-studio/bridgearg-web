import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { getArtists, getWorks } from "@/lib/api";
import { images } from "@/lib/images";
import { SEO } from "@/components/SEO";
import "@/styles/about.css";

const BRACKET_PATH = "M0 0H285V60A227 227 0 0 0 58 287H0Z";
const ISOTIPO_CREAM = "/assets/logos/BRIDGEARG - Exportacion logos-09.svg";

const WHAT_WE_DO = [
  { n: "01", t: "Curated international visibility" },
  { n: "02", t: "Collector communication and inquiry management" },
  { n: "03", t: "Export documentation and legal coordination" },
  { n: "04", t: "Protective packaging and door-to-door delivery" },
] as const;

const PROCESS_STEPS = [
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
] as const;

const BRIDGE_COLS = [
  {
    small: "Origin",
    h: "Argentina",
    p: "Artists, studios, materials, craft and local identity.",
    mid: false,
  },
  {
    small: "BridgeArg",
    h: "Structure",
    p: "Curation, communication, documentation, logistics and professional support.",
    mid: true,
  },
  {
    small: "Destination",
    h: "Collectors",
    p: "International buyers who seek pieces with depth, story and authenticity.",
    mid: false,
  },
] as const;

const NosotrosPage = () => {
  const { data: artists = [] } = useQuery({ queryKey: ["artists"], queryFn: getArtists });
  const { data: works = [] } = useQuery({ queryKey: ["works"], queryFn: () => getWorks() });

  return (
    <PageTransition>
      <div className="about-page min-h-screen">
        <SEO
          title="About"
          description="Learn about BridgeArg, the gallery connecting Argentine contemporary art with global collectors."
          url="/about"
        />
        <Header />
        <main>
          {/* 1. Hero */}
          <section className="about-wrap about-hero">
            <div>
              <p className="about-eyebrow">(About us)</p>
              <h1 className="about-hero__title">
                We are a
                <span className="about-script about-hero__script">Bridge.</span>
              </h1>
              <p className="about-hero__subtitle">
                Between Argentine creation and the collectors who can carry it further.
              </p>
              <p className="about-hero__copy">
                BridgeArg exists to help contemporary Argentine artists cross borders with clarity,
                care and professional structure — connecting Cordoba, Plantation, FL and every shore
                in between.
              </p>
              <div className="about-hero__stats">
                <div className="about-hero__stat">
                  <strong>{works.length}</strong>
                  <span>Curated works</span>
                </div>
                <div className="about-hero__stat">
                  <strong>{artists.length}</strong>
                  <span>Artists</span>
                </div>
              </div>
            </div>

            <div className="about-hero__media">
              <span className="about-hero__bracket" aria-hidden="true">
                <svg viewBox="0 0 285 287" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d={BRACKET_PATH} fill="#1e1517" />
                </svg>
              </span>
              <div className="about-hero__arch">
                <img
                  src={images.theProcess}
                  alt="BridgeArg studio process and curated Argentine artworks"
                />
              </div>
            </div>
          </section>

          {/* 2. Curatorial position */}
          <section className="about-wrap about-curatorial">
            <div className="about-curatorial__card">
              <div className="about-collage">
                <div className="about-collage__img about-collage__img--a">
                  <img
                    src={images.fondoMariano}
                    alt="Studio detail from an Argentine artist represented by BridgeArg"
                    loading="lazy"
                  />
                </div>
                <div className="about-collage__img about-collage__img--b">
                  <img
                    src={images.fondoCaro}
                    alt="Handcrafted textile work from the BridgeArg curated collection"
                    loading="lazy"
                  />
                </div>
                <div className="about-collage__img about-collage__img--c">
                  <img
                    src={images.boxes}
                    alt="Protective art packaging prepared for international shipping"
                    loading="lazy"
                  />
                </div>
              </div>

              <div>
                <p className="about-eyebrow">(Curatorial position)</p>
                <h2 className="about-curatorial__title">
                  BridgeArg is not an open
                  <span className="about-script">marketplace.</span>
                </h2>
                <div className="about-curatorial__copy">
                  <p>
                    Every artist is selected for their trajectory, identity, consistency and ability to
                    sustain a professional international relationship.
                  </p>
                  <p>
                    This curation allows collectors to discover works with cultural value, while artists
                    become part of a platform designed to represent them with seriousness and care.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Why BridgeArg exists */}
          <section className="about-why" data-cursor-theme="dark">
            <img
              className="about-why__mark"
              src={ISOTIPO_CREAM}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
            <div className="about-wrap about-why__grid">
              <div>
                <p className="about-eyebrow about-eyebrow--cream">(Why BridgeArg exists)</p>
                <h2 className="about-why__title">
                  Argentine art has always carried identity, craft and cultural depth.
                </h2>
                <span className="about-script about-why__script">Made to cross bridges.</span>
              </div>
              <div className="about-why__copy">
                <p>
                  But international access has often depended on fragmented systems, complex logistics
                  and isolated opportunities.
                </p>
                <p>
                  BridgeArg was created to become the structure behind the crossing: a platform that
                  gives artists visibility, gives collectors confidence, and gives each work the
                  professional path it deserves.
                </p>
                <p className="about-why__highlight">
                  We do not simply move pieces from one place to another. We protect the story, the
                  material, the origin and the value carried inside each work.
                </p>
              </div>
            </div>
          </section>

          {/* 4. The Bridge */}
          <section className="about-wrap about-bridge">
            <p className="about-eyebrow">(The Bridge)</p>
            <h2 className="about-bridge__title">
              A cultural route built with care, trust and
              <span className="about-script">precision.</span>
            </h2>

            <div className="about-bridge__cols">
              {BRIDGE_COLS.map((col) => (
                <div
                  key={col.h}
                  className={`about-bridge__col ${col.mid ? "about-bridge__col--mid" : "about-bridge__col--edge"}`}
                >
                  <span className="about-bridge__small">{col.small}</span>
                  <h3 className="about-bridge__heading">{col.h}</h3>
                  <p className="about-bridge__text">{col.p}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. What we do */}
          <section className="about-wrap about-what">
            <div className="about-what__grid">
              <div>
                <p className="about-eyebrow">(What we do)</p>
                <h2 className="about-what__title">
                  We build the invisible structure that lets artists focus on
                  <span className="about-script">creating.</span>
                </h2>
                <p className="about-what__copy">
                  Behind every piece there is a silent system of selection, protection, export
                  coordination and collector care. BridgeArg manages the professional framework so the
                  artwork can travel with integrity.
                </p>
              </div>
              <ul className="about-what__list">
                {WHAT_WE_DO.map((item) => (
                  <li key={item.n} className="about-what__item">
                    <span className="about-what__arch" aria-hidden="true">
                      {item.n}
                    </span>
                    <p>{item.t}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 6. Our process */}
          <section className="about-wrap about-process">
            <div className="about-process__intro">
              <div>
                <p className="about-eyebrow">(Our process)</p>
                <h2 className="about-process__title">
                  From studio to collector, each crossing is handled with
                  <span className="about-script">intention.</span>
                </h2>
              </div>
              <p className="about-process__lead">
                A simple process, carefully managed behind the scenes, so the experience remains clear
                for both artists and collectors.
              </p>
            </div>

            <div className="about-process__grid">
              {PROCESS_STEPS.map((step) => (
                <div key={step.s} className="about-process__card">
                  <div
                    className={`about-process__num${step.s === "04" ? " about-process__num--filled" : ""}`}
                    aria-hidden="true"
                  >
                    {step.s}
                  </div>
                  <h3>{step.t}</h3>
                  <p>{step.p}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Close */}
          <section className="about-close" data-cursor-theme="dark">
            <div className="about-wrap">
              <h2 className="about-close__title">
                Art deserves to travel with
                <span className="about-script">integrity.</span>
              </h2>
              <p className="about-close__copy">
                We believe in Argentine talent, in the hands that create, and in the bridges that make
                new paths possible.
              </p>
              <Link to="/contact" className="about-close__btn">
                Start the conversation <span aria-hidden="true">→</span>
              </Link>
              <div className="about-close__foot">
                <p className="about-close__lockup">BridgeArg · Cordoba — Plantation, FL</p>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default NosotrosPage;
