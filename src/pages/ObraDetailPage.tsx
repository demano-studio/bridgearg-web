import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Package, FileCheck, Share2, Loader2 } from "lucide-react";
import {
  getWork,
  getWorks,
  type WorkFromApi,
  FALLBACK_ARTIST_NAME,
  createDiditSession,
  getArtworkReservation,
  releaseCheckoutReservation,
  type ArtworkReservation,
} from "@/lib/api";
import {
  clearMyVerification,
  readMyVerification,
  saveMyVerification,
} from "@/lib/reservation";
import { getWorkImageUrl } from "@/lib/work-images";
import { curatedCollectionOrder, getCollectionSeed } from "@/lib/collectionOrder";
import { shouldShowPrice } from "@/lib/geoPricing";
import { formatDimensionsFromString, formatPounds } from "@/lib/units";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import "@/styles/artwork-detail.css";

const BRACKET_PATH = "M0 0H285V60A227 227 0 0 0 58 287H0Z";

function titleSizeClass(title: string): string {
  const t = title.trim();
  const len = t.length;
  const hasPipe = t.includes("|");
  if (len > 60) return "artwork-detail-title--xl";
  if (len > 30 || hasPipe) return "artwork-detail-title--lg";
  return "";
}

function CornerBracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  return (
    <span className={`artwork-detail-bracket artwork-detail-bracket--${position}`} aria-hidden="true">
      <svg viewBox="0 0 285 287" xmlns="http://www.w3.org/2000/svg">
        <path d={BRACKET_PATH} fill="currentColor" />
      </svg>
    </span>
  );
}

const ArtworkDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workId = id ? parseInt(id, 10) : NaN;
  const [work, setWork] = useState<WorkFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [acquireLoading, setAcquireLoading] = useState(false);
  const [reservation, setReservation] = useState<ArtworkReservation | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [releasing, setReleasing] = useState(false);

  const { data: allWorks = [] } = useQuery({
    queryKey: ["works"],
    queryFn: () => getWorks(),
  });

  /** Same session mix as Collection; pick next 3 after excluding the current work. */
  const [mixSeed] = useState(() => getCollectionSeed());
  const moreWorks = useMemo(() => {
    if (!work || allWorks.length === 0) return [];
    return curatedCollectionOrder(allWorks, mixSeed)
      .filter((w) => w.id !== work.id)
      .slice(0, 3);
  }, [work, allWorks, mixSeed]);

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
      const timer = setTimeout(() => navigate("/artworks", { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, work, navigate]);

  useEffect(() => {
    if (!work || work.status !== "available") {
      setReservation(null);
      return;
    }

    let cancelled = false;
    const refresh = () => {
      getArtworkReservation(work.id, readMyVerification(work.id))
        .then((data) => {
          if (!cancelled) setReservation(data);
        })
        .catch(() => {
          if (!cancelled) setReservation(null);
        });
    };

    refresh();
    const intervalId = window.setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [work]);

  const artistName = work?.artistName?.trim() || FALLBACK_ARTIST_NAME;

  const handleInquire = () => {
    if (!work) return;
    navigate(
      `/contacto?subject=artwork-inquiry&artwork=${encodeURIComponent(work.title)}&artist=${encodeURIComponent(artistName)}`,
    );
  };

  const msLeft = reservation ? new Date(reservation.expiresAt).getTime() - Date.now() : 0;
  const isReserved = msLeft > 0;
  const isMyReservation = Boolean(isReserved && reservation?.mine);
  const isReservedByOther = Boolean(isReserved && !isMyReservation);
  const minutesLeft = Math.max(1, Math.ceil(msLeft / 60000));
  const myVerificationId = work && isMyReservation ? readMyVerification(work.id) : null;

  const handleAcquire = () => {
    if (!work || acquireLoading) return;
    setEmailError("");
    setEmailOpen(true);
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!work || acquireLoading) return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email");
      return;
    }

    setEmailError("");
    setAcquireLoading(true);
    try {
      const session = await createDiditSession(work.id, trimmed);
      sessionStorage.setItem(
        "didit_verification_context",
        JSON.stringify({
          artworkId: work.id,
          verificationId: session.verificationId,
        }),
      );
      saveMyVerification(work.id, session.verificationId);
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

  const handleReleaseReservation = async () => {
    if (!work || !myVerificationId || releasing) return;
    setReleasing(true);
    try {
      const ok = await releaseCheckoutReservation(myVerificationId);
      if (ok) {
        clearMyVerification();
        setReservation(null);
        toast({ title: "Reservation released" });
      } else {
        toast({
          title: "Could not release",
          description: "Could not release. It will expire on its own in a few minutes.",
          variant: "destructive",
        });
      }
    } finally {
      setReleasing(false);
    }
  };

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
        <div className="artwork-detail-page min-h-screen">
          <Header />
          <main>
            <div className="artwork-detail-wrap">
              <Skeleton className="mt-28 h-4 w-32" />
              <div className="artwork-detail-main">
                <Skeleton className="aspect-[4/5] w-full" />
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-12 w-40" />
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (!work) {
    return (
      <PageTransition>
        <div className="artwork-detail-page min-h-screen">
          <Header />
          <main className="artwork-detail-wrap" style={{ paddingTop: "120px", paddingBottom: "80px" }}>
            <h1 className="artwork-detail-title" style={{ fontSize: "48px" }}>
              Work not found
            </h1>
            <p className="artwork-detail-year" style={{ marginTop: "16px" }}>
              This work is no longer available or doesn't exist.
            </p>
            <Link to="/artworks" className="artwork-detail-btn artwork-detail-btn--ink" style={{ marginTop: "32px" }}>
              Back to Works
            </Link>
            <p className="artwork-detail-status">Redirecting to collection...</p>
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
  const priceLabel = shouldShowPrice() ? work.priceDisplay : "Price on request";
  const showDetails = Boolean(work.medium || dimensionsText || weightText);
  const titleClass = ["artwork-detail-title", titleSizeClass(work.title)].filter(Boolean).join(" ");

  return (
    <PageTransition>
      <div className="artwork-detail-page min-h-screen">
        <SEO
          title={work.title}
          description={`${artistName} · ${[work.year, work.medium].filter(Boolean).join(" · ")} · ${work.priceDisplay}`}
          image={work.imagenUrl?.startsWith("http") ? work.imagenUrl : undefined}
          url={`/artworks/${work.id}`}
          type="article"
        />
        <Header />
        <main>
          <div className="artwork-detail-wrap">
            <Link to="/artworks" className="artwork-detail-back">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to Works
            </Link>

            <section className="artwork-detail-main">
              {/* Image column */}
              <div>
                <div className="artwork-detail-frame">
                  <CornerBracket position="tl" />
                  <CornerBracket position="tr" />
                  <CornerBracket position="bl" />
                  <CornerBracket position="br" />
                  <div className="artwork-detail-mat">
                    <img
                      src={currentImage ? getWorkImageUrl(currentImage) : ""}
                      alt={work.title}
                    />
                    {work.status === "sold" && (
                      <div className="artwork-detail-sold">
                        <span>● Private Collection</span>
                      </div>
                    )}
                  </div>
                </div>

                {allImages.length > 1 && (
                  <div
                    className="artwork-detail-thumbs"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(allImages.length, 6)}, 1fr)`,
                    }}
                  >
                    {allImages.map((url, i) => {
                      const isActive = (activeImageUrl ?? allImages[0]) === url;
                      return (
                        <button
                          key={url + i}
                          type="button"
                          data-no-pill
                          className={`artwork-detail-thumb icon-btn${isActive ? " is-active" : ""}`}
                          onClick={() => setActiveImageUrl(url)}
                          aria-label={`View image ${i + 1}`}
                        >
                          <img src={getWorkImageUrl(url)} alt={`${work.title} ${i + 1}`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info column */}
              <div>
                {work.artistSlug ? (
                  <Link to={`/artistas/${work.artistSlug}`} className="artwork-detail-artist">
                    ({artistName})
                  </Link>
                ) : (
                  <p className="artwork-detail-artist">({artistName})</p>
                )}

                <h1 className={titleClass}>{work.title}</h1>

                <div className="artwork-detail-meta">
                  <p className="artwork-detail-year">{work.year || ""}</p>
                  <button type="button" data-no-pill className="artwork-detail-share" onClick={handleShare}>
                    <Share2 aria-hidden />
                    Share
                  </button>
                </div>

                {showDetails && (
                  <div className="artwork-detail-details">
                    <p className="artwork-detail-eyebrow artwork-detail-details__title">Details</p>
                    <dl>
                      {work.medium ? (
                        <div className="artwork-detail-details__row">
                          <dt>Medium</dt>
                          <dd>{work.medium}</dd>
                        </div>
                      ) : null}
                      <div className="artwork-detail-details__row">
                        <dt>Dimensions</dt>
                        <dd>{dimensionsText}</dd>
                      </div>
                      <div className="artwork-detail-details__row">
                        <dt>Weight</dt>
                        <dd>{weightText}</dd>
                      </div>
                    </dl>
                  </div>
                )}

                <div className="artwork-detail-price">
                  <p className="artwork-detail-price__label">Price</p>
                  <p className="artwork-detail-price__value">{priceLabel}</p>
                </div>

                <div className="artwork-detail-actions">
                  {isAvailable ? (
                    <>
                      {isMyReservation && myVerificationId ? (
                        <Link
                          to={`/verify/callback?resume=${encodeURIComponent(myVerificationId)}&artwork=${work.id}`}
                          className="artwork-detail-btn artwork-detail-btn--sky"
                        >
                          Resume payment
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="artwork-detail-btn artwork-detail-btn--sky"
                          onClick={handleAcquire}
                          disabled={acquireLoading || isReservedByOther}
                          aria-busy={acquireLoading}
                        >
                          {acquireLoading ? <Loader2 className="animate-spin" aria-hidden /> : null}
                          {acquireLoading ? "Redirecting..." : isReservedByOther ? "Reserved" : "Acquire"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="artwork-detail-btn artwork-detail-btn--outline"
                        onClick={handleInquire}
                      >
                        <Mail aria-hidden />
                        Inquire
                      </button>
                    </>
                  ) : (
                    <Link
                      to={`/contacto?obra=${encodeURIComponent(work.title)}&artista=${encodeURIComponent(artistName)}`}
                      className="artwork-detail-btn artwork-detail-btn--ink"
                    >
                      Inquire About This Work
                    </Link>
                  )}
                </div>

                {isAvailable ? (
                  <p className="artwork-detail-stripe">Secure checkout powered by Stripe</p>
                ) : null}

                {isAvailable && isMyReservation && myVerificationId ? (
                  <p role="status" className="artwork-detail-status">
                    You have this work reserved for about {minutesLeft} more minutes. Resume your payment, or
                    release it for other collectors.{" "}
                    <button
                      type="button"
                      data-no-pill
                      onClick={handleReleaseReservation}
                      disabled={releasing}
                    >
                      Release reservation
                    </button>
                  </p>
                ) : null}

                {isAvailable && isReservedByOther ? (
                  <p role="status" className="artwork-detail-status">
                    Another collector is completing the acquisition of this work. If it isn't completed, it
                    becomes available again in about {minutesLeft} minutes.
                  </p>
                ) : null}
              </div>
            </section>

            {/* More from the collection */}
            {moreWorks.length > 0 && (
              <section className="artwork-detail-more">
                <div className="artwork-detail-more__head">
                  <div>
                    <p className="artwork-detail-eyebrow">(Keep exploring)</p>
                    <h2 className="artwork-detail-more__title">
                      More from the
                      <span className="artwork-detail-script">collection</span>
                    </h2>
                  </div>
                  <Link to="/artworks" className="artwork-detail-more__all">
                    View all works
                  </Link>
                </div>
                <div className="artwork-detail-more__grid">
                  {moreWorks.map((related) => {
                    const relatedArtist = related.artistName?.trim() || FALLBACK_ARTIST_NAME;
                    return (
                      <Link
                        key={related.id}
                        to={`/artworks/${related.id}`}
                        className="artwork-detail-card"
                      >
                        <div className="artwork-detail-card__media" data-cursor="photo">
                          <img
                            src={getWorkImageUrl(related.imagenUrl)}
                            alt={related.title}
                            loading="lazy"
                          />
                        </div>
                        <p className="artwork-detail-card__artist">{relatedArtist}</p>
                        <h3 className="artwork-detail-card__title">{related.title}</h3>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Artist bio */}
            {work.artistBio && (
              <section className="artwork-detail-extra">
                <div className="artwork-detail-extra__block">
                  {work.artistPhoto ? (
                    <div className="artwork-detail-extra__photo">
                      <img src={work.artistPhoto} alt={artistName} />
                    </div>
                  ) : null}
                  <div>
                    <p className="artwork-detail-eyebrow artwork-detail-extra__label">About the artist</p>
                    <h3 className="artwork-detail-extra__heading">
                      {work.artistSlug ? (
                        <Link to={`/artistas/${work.artistSlug}`}>{artistName}</Link>
                      ) : (
                        artistName
                      )}
                    </h3>
                    <p className="artwork-detail-extra__copy">{work.artistBio}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Shipping & Certificate */}
            <section className="artwork-detail-extra">
              <div className="artwork-detail-extra__grid">
                <div className="artwork-detail-extra__block">
                  <Package className="artwork-detail-extra__icon" aria-hidden />
                  <div>
                    <h2 className="artwork-detail-extra__heading">Shipping & Logistics</h2>
                    <p className="artwork-detail-extra__copy">
                      White-glove international shipping included. We handle all export documentation from
                      Argentina to your doorstep.
                    </p>
                  </div>
                </div>
                <div className="artwork-detail-extra__block">
                  <FileCheck className="artwork-detail-extra__icon" aria-hidden />
                  <div>
                    <h2 className="artwork-detail-extra__heading">Certificate of Authenticity</h2>
                    <p className="artwork-detail-extra__copy">
                      Each work includes a Certificate of Authenticity—both physical and digital—signed by the
                      artist, attesting to the piece’s provenance and authenticity.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Before we verify your identity</DialogTitle>
                <DialogDescription>
                  Enter your email. We'll use it only for this acquisition: to keep you updated and to remind
                  you if you don't finish.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEmailContinue} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="acquire-email">Email</Label>
                  <Input
                    id="acquire-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={acquireLoading}
                  />
                  {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
                </div>
                <Button type="submit" variant="acquire" disabled={acquireLoading} aria-busy={acquireLoading}>
                  {acquireLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Continue
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ArtworkDetailPage;
