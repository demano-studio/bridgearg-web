import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const ARTISTS_PHOTO =
  "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/render/image/public/ui-assets/bridgearg-281.jpg?width=1600&quality=82";

export function ArtistsSection() {
  const isMobile = useIsMobile();

  return (
    <section
      className="artists-reveal-section"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        padding: isMobile ? "3.5rem 1.5rem" : "5.5rem 2rem",
        textAlign: "center",
      }}
    >
      <div
        className="artists-reveal-section__photo"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${ARTISTS_PHOTO})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 1,
        }}
        aria-hidden
      />
      <div
        className="artists-reveal-section__overlay"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: "rgba(16,14,12,0.68)",
          opacity: 1,
        }}
        aria-hidden
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        <p className="artists-reveal-section__eyebrow">Curated Argentine Talent</p>
        <h2 className="artists-reveal-section__title font-display">Artists who</h2>
        <p className="artists-reveal-section__script">cross bridges.</p>
        <p className="artists-reveal-section__paragraph">
          A curated selection of Argentine artists whose work carries craft, memory and identity beyond borders.
        </p>
        <Link to="/artists" className="artists-reveal-section__cta">
          Meet the artists →
        </Link>
      </div>
      <style>{`
        .artists-reveal-section__eyebrow {
          margin: 0 0 1.25rem;
          text-transform: uppercase;
          letter-spacing: 4px;
          font-size: 11px;
          color: #7fb2d1;
          font-family: "Onest", sans-serif;
        }
        .artists-reveal-section__title {
          margin: 0;
          font-size: ${isMobile ? "2.2rem" : "3.2rem"};
          font-weight: 700;
          line-height: 1;
          color: #ffffff;
        }
        .artists-reveal-section__script {
          margin: 0.25rem 0 0;
          font-family: "BestDB", "Caveat", cursive;
          font-style: italic;
          font-weight: 400;
          font-size: ${isMobile ? "1.9rem" : "2.6rem"};
          line-height: 1.1;
          color: #7fb2d1;
        }
        .artists-reveal-section__paragraph {
          margin: 0 auto 1.75rem;
          max-width: 480px;
          font-size: ${isMobile ? "0.9rem" : "0.95rem"};
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.8);
          font-family: "Onest", sans-serif;
        }
        .artists-reveal-section__cta {
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
        .artists-reveal-section__cta:hover {
          color: #7fb2d1;
          border-bottom-color: #7fb2d1;
        }
      `}</style>
    </section>
  );
}
