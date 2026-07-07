import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Package, FileCheck, Share2, Loader2 } from "lucide-react";
import {
  getWork,
  getWorks,
  type WorkFromApi,
  FALLBACK_ARTIST_NAME,
  createDiditSession,
} from "@/lib/api";
import { WorkImage } from "@/components/WorkImage";
import { getWorkImageUrl } from "@/lib/work-images";
import { formatDimensionsFromString, formatPounds } from "@/lib/units";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const ArtworkDetailPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workId = id ? parseInt(id, 10) : NaN;
  const [work, setWork] = useState<WorkFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [acquireLoading, setAcquireLoading] = useState(false);

  const { data: relatedWorks = [] } = useQuery({
    queryKey: ["works", work?.artistSlug],
    queryFn: () => getWorks(work!.artistSlug),
    enabled: !!work?.artistSlug,
  });

  const otherWorks = useMemo(() => {
    return relatedWorks.filter((w) => w.id !== workId).slice(0, 4);
  }, [relatedWorks, workId]);

  useEffect(() => {
    if (Number.isNaN(workId) || workId < 1) {
      setLoading(false);
      setWork(null);
      return;
    }
    let cancelled = false;
    getWork(workId)
      .then((data) => {
        if (!cancelled) setWork(data);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Error", description: "Could not load work.", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workId]);

  useEffect(() => {
    setActiveImageUrl(null);
  }, [workId]);

  useEffect(() => {
    if (!loading && !work) {
      const timer = setTimeout(
        () => navigate("/artworks", { replace: true }),
        2000,
      );
      return () => clearTimeout(timer);
    }
  }, [loading, work, navigate]);

  const handleInquire = () => {
    if (!work) return;
    navigate(
      `/contacto?subject=artwork-inquiry&artwork=${encodeURIComponent(work.title)}&artist=${encodeURIComponent(artistName)}`,
    );
  };

  const handleAcquire = async () => {
    if (!work || acquireLoading) return;
    setAcquireLoading(true);
    try {
      const session = await createDiditSession(work.id);
      sessionStorage.setItem(
        "didit_verification_context",
        JSON.stringify({
          artworkId: work.id,
          verificationId: session.verificationId,
        }),
      );
      window.location.href = session.url;
    } catch (err) {
      toast({
        title: "Verification unavailable",
        description: err instanceof Error ? err.message : "Could not start identity verification.",
        variant: "destructive",
      });
      setAcquireLoading(false);
    }
  };

  const artistName = work?.artistName?.trim() || FALLBACK_ARTIST_NAME;

  const handleShare = async () => {
    if (!work) return;
    const url = window.location.href;
    const shareData = {
      title: work.title,
      text: `${artistName} — ${work.title}`,
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "The link to this work has been copied to your clipboard.",
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "The link to this work has been copied to your clipboard.",
        });
      }
    }
  };

  const isAvailable = work?.status === "available";

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <main>
            <div className="container mx-auto pt-8">
              <Skeleton className="h-4 w-24" />
            </div>
            <section className="section-padded border-b border-border">
              <div className="container mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                  <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
                  <div className="flex flex-col justify-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-12 w-40" />
                  </div>
                </div>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (!work) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="section-padded">
            <div className="container mx-auto text-center">
              <h1 className="text-display text-4xl mb-4">Work not found</h1>
              <p className="text-muted-foreground mb-8">
                This work is no longer available or doesn't exist.
              </p>
              <Button variant="technical" asChild>
                <Link to="/artworks">Back to Works</Link>
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                Redirecting to collection...
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  const dimensionsText = formatDimensionsFromString(work.dimensions);
  const weightText = formatPounds(work.weight_kg);

  const allImages = [work.imagenUrl, ...(work.galleryUrls ?? [])].filter(Boolean);
  const currentImage = activeImageUrl ?? allImages[0] ?? "";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title={work.title}
          description={`${artistName} · ${[work.year, work.medium].filter(Boolean).join(" · ")} · ${work.priceDisplay}`}
          image={work.imagenUrl?.startsWith("http") ? work.imagenUrl : undefined}
          url={`/artworks/${work.id}`}
          type="article"
        />
        <Header />
        <main>
          <div className="container mx-auto pt-8">
            <Link
              to="/artworks"
              className="inline-flex items-center gap-2 text-label hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Works
            </Link>
          </div>

          {/* Hero: image + title, artist, price */}
          <section className="section-padded border-b border-border">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                <div className="w-full overflow-hidden rounded-2xl bg-background shadow-sm">
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ position: "relative", width: "100%" }}>
                      <div
                        style={{
                          width: "100%",
                          backgroundColor: "#fcfcfc",
                          padding: "clamp(16px, 2vw, 28px)",
                          boxShadow: "0 24px 60px rgba(30,21,23,0.06)",
                        }}
                      >
                        <img
                          src={currentImage ? getWorkImageUrl(currentImage) : ""}
                          alt={work.title}
                          style={{
                            width: "100%",
                            height: "auto",
                            maxHeight: isMobile ? "420px" : "clamp(420px, 70vh, 800px)",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      </div>
                      {work.status === "sold" && (
                        <div
                          className="rounded-2xl"
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(30,21,23,0.5)",
                          }}
                        >
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#1e1517]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#1e1517]/60">
                            ● Private Collection
                          </span>
                        </div>
                      )}
                    </div>

                    {allImages.length > 1 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${Math.min(allImages.length, isMobile ? 3 : isTablet ? 4 : 6)}, 1fr)`,
                          gap: "12px",
                        }}
                      >
                        {allImages.map((url, i) => {
                          const isActive = (activeImageUrl ?? allImages[0]) === url;
                          return (
                            <button
                              key={url + i}
                              type="button"
                              onClick={() => setActiveImageUrl(url)}
                              style={{
                                padding: 0,
                                border: isActive ? "2px solid #7FB2D1" : "2px solid transparent",
                                backgroundColor: "#fcfcfc",
                                cursor: "pointer",
                                aspectRatio: "1",
                                overflow: "hidden",
                                transition: "border-color 0.2s ease",
                              }}
                              aria-label={`View image ${i + 1}`}
                            >
                              <img
                                src={getWorkImageUrl(url)}
                                alt={`${work.title} ${i + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                  opacity: isActive ? 1 : 0.7,
                                  transition: "opacity 0.2s ease",
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <p className="text-label mb-2">
                    {work.artistSlug ? (
                      <Link to={`/artistas/${work.artistSlug}`} className="hover:text-foreground transition-colors">
                        {artistName}
                      </Link>
                    ) : (
                      artistName
                    )}
                  </p>
                  <h1 className="text-display text-4xl md:text-5xl lg:text-6xl mb-6">{work.title}</h1>
                  {/* year comes from Supabase artworks.year field — populate it per artwork */}
                  {(work.year || work.medium) && (
                    <p className="text-muted-foreground text-sm mb-6">
                      {[work.year, work.medium].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  <button
                    onClick={handleShare}
                    style={{ color: '#1e1517' }}
                    className="inline-flex items-center gap-2 mb-6 text-[10px] font-medium uppercase tracking-[0.18em] opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>

                  {/* Dimensions & weight — clear block */}
                  <div className="tech-box mb-8">
                    <h3 className="text-technical text-foreground mb-3">Details</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Dimensions</dt>
                        <dd className="font-medium text-foreground">{dimensionsText}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Weight</dt>
                        <dd className="font-medium text-foreground">{weightText}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4 mb-8">
                    <span className="font-display text-2xl font-semibold text-foreground">{work.priceDisplay}</span>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {isAvailable ? (
                      <>
                        <Button
                          variant="acquire"
                          size="xl"
                          onClick={handleAcquire}
                          className="gap-2"
                          disabled={acquireLoading}
                          aria-busy={acquireLoading}
                        >
                          {acquireLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                          ) : null}
                          {acquireLoading ? "Redirecting..." : "Acquire"}
                        </Button>
                        <Button
                          variant="acquire"
                          size="xl"
                          onClick={handleInquire}
                          className="gap-2"
                        >
                          <Mail className="h-5 w-5" />
                          Inquire
                        </Button>
                      </>
                    ) : (
                      <Button variant="acquire" size="xl" asChild className="gap-2">
                        <Link
                          to={`/contacto?obra=${encodeURIComponent(work.title)}&artista=${encodeURIComponent(
                            artistName,
                          )}`}
                        >
                          Inquire About This Work
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Artist bio */}
          {work.artistBio && (
            <section className="section-padded border-t border-border">
              <div className="container mx-auto">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  {work.artistPhoto && (
                    <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border border-border">
                      <img
                        src={work.artistPhoto}
                        alt={artistName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-label text-muted-foreground mb-1">About the artist</p>
                    {work.artistSlug ? (
                      <Link to={`/artistas/${work.artistSlug}`} className="hover:text-foreground transition-colors">
                        <h3 className="text-display text-xl font-semibold mb-3">{artistName}</h3>
                      </Link>
                    ) : (
                      <h3 className="text-display text-xl font-semibold mb-3">{artistName}</h3>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">{work.artistBio}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {otherWorks.length > 0 && (
            <section className="section-padded border-t border-border">
              <div className="container mx-auto">
                <h2 className="text-technical text-foreground font-semibold mb-8">More works by {artistName}</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8">
                  {otherWorks.map((relatedWork) => (
                    <Link key={relatedWork.id} to={`/artworks/${relatedWork.id}`} className="group block">
                      <div className="flex flex-col border border-border bg-card transition-shadow hover:shadow-md">
                        <div
                          className="relative aspect-[4/5] overflow-hidden"
                          style={{ backgroundColor: "rgba(30,21,23,0.04)" }}
                        >
                          <WorkImage
                            imagenUrl={relatedWork.imagenUrl}
                            title={relatedWork.title}
                            artistName={artistName}
                            className="h-full w-full"
                            imageClassName="!object-contain !object-center transition-[filter] duration-500 ease-out saturate-[0.86] contrast-[0.95] group-hover:saturate-100 group-hover:contrast-100"
                          />
                          {!relatedWork.available && (
                            <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                              <p className="px-4 py-2 text-center text-background/95 text-sm font-light italic max-w-[80%]">
                                Private collection
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-border/80 bg-card px-4 py-4">
                          <h3 className="font-display text-sm font-semibold text-foreground truncate">
                            {relatedWork.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {relatedWork.available ? relatedWork.priceDisplay : "Private collection"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Shipping & Logistics */}
          <section className="section-padded border-b border-border bg-muted/30">
            <div className="container mx-auto">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-shrink-0 rounded-lg bg-background border border-border p-4">
                  <Package className="h-8 w-8 text-foreground" />
                </div>
                <div>
                  <h2 className="text-technical text-foreground font-semibold mb-2">Shipping & Logistics</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                    White-glove international shipping included. We handle all export documentation from Argentina to
                    your doorstep.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Certificate of Authenticity */}
          <section className="section-padded">
            <div className="container mx-auto">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-shrink-0 rounded-lg bg-background border border-border p-4">
                  <FileCheck className="h-8 w-8 text-foreground" />
                </div>
                <div>
                  <h2 className="text-technical text-foreground font-semibold mb-2">Certificate of Authenticity</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                    Each work includes a Certificate of Authenticity—both physical and digital—signed by the artist,
                    attesting to the piece’s provenance and authenticity.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtworkDetailPage;
