import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const WORKS_PHOTO =
  "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/render/image/public/ui-assets/bridgearg-164.jpg?width=1600&quality=82";

export function SelectedWorksSection() {
  const isMobile = useIsMobile();

  return (
    <section
      className="curated-reveal-section"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        padding: isMobile ? "3.5rem 1.5rem" : "5.5rem 2rem",
        textAlign: "center",
      }}
    >
      <div
        className="curated-reveal-section__photo"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${WORKS_PHOTO})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 1,
        }}
        aria-hidden
      />
      <div
        className="curated-reveal-section__overlay"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "rgba(16,14,12,0.6)",
          opacity: 1,
        }}
        aria-hidden
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <p className="curated-reveal-section__eyebrow">Curated Works</p>
        <h2 className="curated-reveal-section__title font-display">Objects that hold</h2>
        <p className="curated-reveal-section__script">memory and origin.</p>
        <p className="curated-reveal-section__paragraph">
          A selection of Argentine pieces chosen for their materiality, story and cultural value.
        </p>
        <Link to="/artworks" className="curated-reveal-section__cta">
          View the collection →
        </Link>
      </div>
      <style>{`
        .curated-reveal-section__eyebrow {
          margin: 0 0 1.25rem;
          text-transform: uppercase;
          letter-spacing: 4px;
          font-size: 11px;
          color: #7fb2d1;
          font-family: "Onest", sans-serif;
        }
        .curated-reveal-section__title {
          margin: 0;
          font-size: ${isMobile ? "2.2rem" : "3.2rem"};
          font-weight: 700;
          line-height: 1;
          color: #ffffff;
        }
        .curated-reveal-section__script {
          margin: 0.25rem 0 0;
          font-family: "BestDB", "Caveat", cursive;
          font-style: italic;
          font-weight: 400;
          font-size: ${isMobile ? "1.9rem" : "2.6rem"};
          line-height: 1.1;
          color: #7fb2d1;
        }
        .curated-reveal-section__paragraph {
          margin: 0 auto 1.75rem;
          max-width: 480px;
          font-size: ${isMobile ? "0.9rem" : "0.95rem"};
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.75);
          font-family: "Onest", sans-serif;
        }
        .curated-reveal-section__cta {
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 0.72rem;
          color: #ffffff;
          border-bottom: 1px solid #7fb2d1;
          padding-bottom: 3px;
          text-decoration: none;
          font-family: "Onest", sans-serif;
          transition: color 0.3s ease, border-color 0.3s ease;
        }
        .curated-reveal-section__cta:hover {
          color: #7fb2d1;
          border-bottom-color: #7fb2d1;
        }
      `}</style>
    </section>
  );
}
