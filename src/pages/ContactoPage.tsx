import type { CSSProperties } from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "@/hooks/use-toast";
import { submitContact } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const CONTACT_SUBJECT_OPTIONS = [
  "Artwork inquiry",
  "Artist representation",
  "Collector support",
  "Partnership",
  "Customer service",
] as const;

const sectionLabelStyle: CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(30,21,23,0.62)",
  marginBottom: "24px",
  fontFamily: '"Onest", sans-serif',
};

const fieldLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginBottom: "14px",
  fontFamily: '"Onest", sans-serif',
  color: "#1e1517",
};

const fieldControlStyle: CSSProperties = {
  width: "100%",
  border: 0,
  outline: 0,
  backgroundColor: "transparent",
  fontSize: "17px",
  color: "#1e1517",
  fontFamily: "inherit",
  padding: "8px 0",
};

const ContactoPage = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [searchParams] = useSearchParams();

  const obraParam = searchParams.get("obra");
  const artistaParam = searchParams.get("artista");
  const artworkParam = searchParams.get("artwork");
  const artistParam = searchParams.get("artist");
  const subjectParam = searchParams.get("subject");
  const isArtworkInquiryParam = subjectParam === "artwork-inquiry";

  const normalizedSubjectParam =
    subjectParam &&
    (CONTACT_SUBJECT_OPTIONS as readonly string[]).includes(subjectParam)
      ? subjectParam
      : "";

  const initialSubject = normalizedSubjectParam
    ? normalizedSubjectParam
    : isArtworkInquiryParam
      ? "Artwork inquiry"
    : obraParam
      ? "Artwork inquiry"
      : artistaParam
        ? "Artist representation"
        : "";

  const initialMessage = isArtworkInquiryParam
    ? artworkParam?.trim() && artistParam?.trim()
      ? `Hi, I'm interested in ${artworkParam.trim()} by ${artistParam.trim()}. Could you share more details?`
      : ""
    : obraParam
    ? `I'm interested in the work: ${obraParam}`
    : artistaParam
      ? `I'd like to know more about: ${artistaParam}`
      : "";

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    subject?: string;
    message: string;
  }>({
    name: "",
    email: "",
    subject: initialSubject || undefined,
    message: initialMessage,
  });
  const [sending, setSending] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    name: string;
    email: string;
    subject: string;
    message: string;
  }>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: {
      name: string;
      email: string;
      subject: string;
      message: string;
    } = {
      name: "",
      email: "",
      subject: "",
      message: "",
    };

    if (!formData.name.trim()) {
      nextErrors.name = "This field is required";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "This field is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid email";
    }

    if (!formData.message.trim()) {
      nextErrors.message = "This field is required";
    }

    if (
      !formData.subject ||
      !(CONTACT_SUBJECT_OPTIONS as readonly string[]).includes(formData.subject)
    ) {
      nextErrors.subject = "Please select a subject";
    }

    const hasErrorsAfterSubject = Object.values(nextErrors).some(Boolean);
    if (hasErrorsAfterSubject) {
      setErrors(nextErrors);
      return;
    }
    setSending(true);
    try {
      await submitContact({ ...formData, subject: formData.subject! });
      toast({
        title: "Message sent",
        description: "Thank you for your inquiry. We will respond shortly.",
      });
      setLegalAccepted(false);
      setFormSent(true);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not send your message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const placeholderClass = "placeholder:text-[rgba(30,21,23,0.42)]";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Contact"
          description="Get in touch with BridgeArg for artist inquiries, acquisitions, and more."
          url="/contact"
        />
        <Header />
        <main>
          {/* 1. Hero */}
          <section
            className="relative grid max-[979px]:grid-cols-1 min-[980px]:grid-cols-[1.05fr_0.95fr]"
            style={{
              padding: isMobile ? "40px 20px" : "clamp(120px, 18vh, 180px) clamp(24px, 14vw, 200px) clamp(60px, 10vh, 120px)",
              gap: isMobile ? "24px" : "70px",
              alignItems: "center",
              borderBottom: "1px solid rgba(30,21,23,0.18)",
              overflow: "hidden",
              minHeight: isMobile ? "auto" : "100vh",
            }}
          >
            <div style={{ position: "relative", zIndex: 2 }}>
              <p
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(30,21,23,0.62)",
                  marginBottom: "26px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Get in touch
              </p>
              <h1
                style={{
                  fontSize: "clamp(70px, 8vw, 138px)",
                  ...(isMobile ? { fontSize: "52px" } : {}),
                  lineHeight: 0.9,
                  letterSpacing: "-0.075em",
                  fontWeight: 800,
                  maxWidth: "750px",
                  fontFamily: '"Onest", sans-serif',
                  margin: 0,
                }}
              >
                <span style={{ display: "block", color: "#1e1517" }}>Let&apos;s build the</span>
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
                  bridge.
                </span>
              </h1>
              <p
                style={{
                  fontSize: "21px",
                  ...(isMobile ? { fontSize: "16px" } : {}),
                  lineHeight: 1.55,
                  color: "rgba(30,21,23,0.62)",
                  maxWidth: "590px",
                  marginTop: "34px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Whether you are interested in a work, an artist, or a possible collaboration, BridgeArg
                is here to guide the crossing with clarity and care.
              </p>
            </div>
            <div
              className="max-[979px]:mt-0 max-[979px]:border-t max-[979px]:border-[rgba(30,21,23,0.18)] max-[979px]:border-l-0 max-[979px]:pl-0 max-[979px]:pt-7 min-[980px]:self-end min-[980px]:border-l min-[980px]:border-[rgba(30,21,23,0.18)] min-[980px]:pl-[34px]"
              style={{
                maxWidth: "420px",
                position: "relative",
                zIndex: 2,
              }}
            >
              <strong
                style={{
                  display: "inline-block",
                  fontFamily: '"BestDB", "Caveat", cursive',
                  fontSize: "32px",
                  lineHeight: 1.1,
                  fontWeight: 400,
                  marginBottom: "18px",
                  color: "#7FB2D1",
                  transform: "rotate(-4deg)",
                }}
              >
                Every conversation starts with care.
              </strong>
              <span
                style={{
                  display: "block",
                  fontSize: "14px",
                  lineHeight: 1.8,
                  color: "rgba(30,21,23,0.62)",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Tell us what you are looking for — we will help you find the right piece, artist, or
                path.
              </span>
            </div>
          </section>

          {/* 2. Route strip */}
          <section
            className="grid max-[979px]:grid-cols-1 min-[980px]:grid-cols-[1fr_auto_1fr]"
            style={{
              borderBottom: "1px solid rgba(30,21,23,0.18)",
              minHeight: isMobile ? "auto" : "150px",
              alignItems: "center",
            }}
          >
            <div style={{ padding: "42px clamp(16px, 7vw, 120px)" }}>
              <span
                style={{
                  display: "block",
                  fontSize: "11px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(30,21,23,0.62)",
                  marginBottom: "12px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Argentina
              </span>
              <b
                style={{
                  fontSize: "30px",
                  letterSpacing: "-0.04em",
                  fontFamily: '"Onest", sans-serif',
                  fontWeight: 600,
                  color: "#1e1517",
                }}
              >
                Cordoba
              </b>
            </div>
            <div
              className="max-[979px]:mx-[8vw] max-[979px]:w-auto min-[980px]:w-[30vw]"
              style={{
                height: "1px",
                backgroundColor: "#1e1517",
                position: "relative",
                opacity: 0.55,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  left: 0,
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  backgroundColor: "#1e1517",
                }}
                aria-hidden
              />
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: 0,
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  backgroundColor: "#1e1517",
                }}
                aria-hidden
              />
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "42px",
                  height: "42px",
                  border: "1px solid rgba(30,21,23,0.18)",
                  borderRadius: "50%",
                  backgroundColor: "#fcf8ea",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-hidden
              >
                <span
                  style={{
                    width: "11px",
                    height: "11px",
                    backgroundColor: "#7FB2D1",
                    borderRadius: "50%",
                  }}
                />
              </span>
            </div>
            <div
              className="max-[979px]:text-left min-[980px]:text-right"
              style={{ padding: "42px clamp(16px, 7vw, 120px)" }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "11px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(30,21,23,0.62)",
                  marginBottom: "12px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                United States
              </span>
              <b
                style={{
                  fontSize: "30px",
                  letterSpacing: "-0.04em",
                  fontFamily: '"Onest", sans-serif',
                  fontWeight: 600,
                  color: "#1e1517",
                }}
              >
                Plantation, FL
              </b>
            </div>
          </section>

          {/* 3. Contact wrap */}
          <section
            className="grid max-[979px]:grid-cols-1 min-[980px]:grid-cols-[1.1fr_0.9fr]"
            style={{
              padding: isMobile ? "40px 20px 60px" : "94px clamp(24px, 14vw, 200px) 115px",
              gap: isMobile ? "24px" : "clamp(40px, 5vw, 82px)",
              alignItems: "start",
            }}
          >
            {/* A. Form column */}
            <div>
              <p style={sectionLabelStyle}>Inquiry form</p>
              <p
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(28px, 3vw, 36px)",
                  lineHeight: 1.15,
                  fontWeight: 400,
                  maxWidth: "620px",
                  marginBottom: "46px",
                  color: "#1e1517",
                }}
              >
                A simple way to begin a conversation about art, logistics, representation or
                collaboration.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "42px" }}>
                {CONTACT_SUBJECT_OPTIONS.map((label) => {
                  const active = formData.subject === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={formSent}
                      onClick={() => {
                        setFormData({ ...formData, subject: label });
                        if (errors.subject) {
                          setErrors({ ...errors, subject: "" });
                        }
                      }}
                      className={
                        active
                          ? "border border-[#1e1517] bg-[#1e1517] text-[#fcf8ea] transition duration-200 hover:bg-[#1e1517] hover:text-[#fcf8ea] hover:border-[#1e1517] disabled:cursor-not-allowed disabled:opacity-60"
                          : "border border-[rgba(30,21,23,0.18)] bg-transparent text-[#1e1517] transition duration-200 hover:border-[#1e1517] hover:bg-[#1e1517] hover:text-[#fcf8ea] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[rgba(30,21,23,0.18)] disabled:hover:bg-transparent disabled:hover:text-[#1e1517]"
                      }
                      style={{
                        padding: "12px 16px",
                        fontSize: "11px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        borderRadius: 0,
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {formSent && (
                <div
                  style={{
                    padding: "24px",
                    border: "1px solid #7FB2D1",
                    backgroundColor: "rgba(127,178,209,0.08)",
                    color: "#1e1517",
                    marginBottom: "32px",
                    fontFamily: '"Onest", sans-serif',
                    fontSize: "15px",
                    lineHeight: 1.5,
                  }}
                >
                  Thank you for your inquiry. We will respond shortly.
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        name: "",
                        email: "",
                        subject: initialSubject || undefined,
                        message: initialMessage,
                      });
                      setLegalAccepted(false);
                      setFormSent(false);
                    }}
                    style={{
                      display: "block",
                      marginTop: "14px",
                      fontSize: "12px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      textDecoration: "underline",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "inherit",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Send another message
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "26px" }}>
                <div style={{ position: "relative", borderBottom: "1px solid rgba(30,21,23,0.18)", paddingBottom: "16px" }}>
                  <label htmlFor="name" style={fieldLabelStyle}>
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    disabled={formSent}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) {
                        setErrors({ ...errors, name: "" });
                      }
                    }}
                    placeholder="Your name"
                    className={placeholderClass}
                    style={fieldControlStyle}
                  />
                  {errors.name && (
                    <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>{errors.name}</p>
                  )}
                </div>

                <div style={{ position: "relative", borderBottom: "1px solid rgba(30,21,23,0.18)", paddingBottom: "16px" }}>
                  <label htmlFor="email" style={fieldLabelStyle}>
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled={formSent}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: "" });
                      }
                    }}
                    placeholder="your@email.com"
                    className={placeholderClass}
                    style={fieldControlStyle}
                  />
                  {errors.email && (
                    <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>{errors.email}</p>
                  )}
                </div>

                <div style={{ position: "relative", borderBottom: "1px solid rgba(30,21,23,0.18)", paddingBottom: "16px" }}>
                  <label htmlFor="subject" style={fieldLabelStyle}>
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject ?? ""}
                    disabled={formSent}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, subject: v || undefined });
                      if (errors.subject) {
                        setErrors({ ...errors, subject: "" });
                      }
                    }}
                    className={placeholderClass}
                    style={{
                      ...fieldControlStyle,
                      cursor: formSent ? "not-allowed" : "pointer",
                      appearance: "auto",
                    }}
                  >
                    <option value="" disabled>
                      Select a subject
                    </option>
                    {CONTACT_SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>{errors.subject}</p>
                  )}
                </div>

                <div style={{ position: "relative", borderBottom: "1px solid rgba(30,21,23,0.18)", paddingBottom: "16px" }}>
                  <label htmlFor="message" style={fieldLabelStyle}>
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    disabled={formSent}
                    onChange={(e) => {
                      setFormData({ ...formData, message: e.target.value });
                      if (errors.message) {
                        setErrors({ ...errors, message: "" });
                      }
                    }}
                    placeholder="Tell us what you are looking for..."
                    rows={5}
                    className={placeholderClass}
                    style={{
                      ...fieldControlStyle,
                      minHeight: "150px",
                      resize: "vertical",
                    }}
                  />
                  {errors.message && (
                    <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>{errors.message}</p>
                  )}
                </div>

                <div style={{ marginTop: "4px" }}>
                  <label
                    htmlFor="legal-accepted"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      cursor: formSent ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      id="legal-accepted"
                      type="checkbox"
                      checked={legalAccepted}
                      disabled={formSent}
                      onChange={(e) => setLegalAccepted(e.target.checked)}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                    />
                    <span
                      aria-hidden
                      style={{
                        width: "18px",
                        height: "18px",
                        border: "1px solid #1e1517",
                        backgroundColor: legalAccepted ? "#7FB2D1" : "transparent",
                        color: "#fcf8ea",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        lineHeight: 1,
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                    >
                      {legalAccepted ? "✓" : ""}
                    </span>
                    <span
                      style={{
                        fontFamily: '"Onest", sans-serif',
                        fontSize: "13px",
                        lineHeight: 1.6,
                        color: "rgba(30,21,23,0.78)",
                      }}
                    >
                      I have read and accept the{" "}
                      <Link
                        to="/legal#terms"
                        style={{ color: "#7FB2D1", textDecoration: "none", borderBottom: "1px solid transparent" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderBottomColor = "#7FB2D1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderBottomColor = "transparent";
                        }}
                      >
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/legal#privacy"
                        style={{ color: "#7FB2D1", textDecoration: "none", borderBottom: "1px solid transparent" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderBottomColor = "#7FB2D1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderBottomColor = "transparent";
                        }}
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={sending || formSent || !legalAccepted}
                  className="transition duration-300 enabled:hover:border-[#1e1517] enabled:hover:bg-transparent enabled:hover:text-[#1e1517]"
                  style={{
                    marginTop: "18px",
                    width: "max-content",
                    backgroundColor: "#1e1517",
                    color: "#fcf8ea",
                    border: "1px solid #1e1517",
                    padding: "18px 34px",
                    fontSize: "12px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor: sending || formSent || !legalAccepted ? "not-allowed" : "pointer",
                    fontFamily: '"Onest", sans-serif',
                    opacity: sending || formSent || !legalAccepted ? 0.5 : 1,
                  }}
                >
                  {sending ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Sending...
                    </span>
                  ) : (
                    "Send message"
                  )}
                </button>
              </form>
            </div>

            {/* B. Info panel */}
            <aside
              className="max-[979px]:static max-[979px]:p-7 min-[980px]:sticky min-[980px]:p-[42px]"
              style={{
                top: isTablet ? "96px" : "118px",
                border: "1px solid rgba(30,21,23,0.18)",
                backgroundColor: "rgba(252,248,234,0.58)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <p style={sectionLabelStyle}>BridgeArg contact</p>
              <h2
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(34px, 3.5vw, 44px)",
                  lineHeight: 1.05,
                  fontWeight: 500,
                  marginBottom: "30px",
                  color: "#1e1517",
                }}
              >
                One route, two shores.
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: 1.8,
                  color: "rgba(30,21,23,0.62)",
                  marginBottom: "38px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                BridgeArg works between Argentine studios and international collectors, managing each
                conversation with a curatorial and professional approach.
              </p>
              <div style={{ display: "grid", gap: "18px" }}>
                <div style={{ borderTop: "1px solid rgba(30,21,23,0.18)", paddingTop: "22px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(30,21,23,0.62)",
                      marginBottom: "12px",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Email
                  </span>
                  <a
                    href="mailto:info@bridgearg.net"
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.55,
                      color: "#1e1517",
                      textDecoration: "none",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    info@bridgearg.net
                  </a>
                </div>
                <div style={{ borderTop: "1px solid rgba(30,21,23,0.18)", paddingTop: "22px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(30,21,23,0.62)",
                      marginBottom: "12px",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Whatsapp | iMessage |Text Message
                  </span>
                  <p
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.55,
                      color: "#1e1517",
                      textDecoration: "none",
                      fontFamily: '"Onest", sans-serif',
                      margin: 0,
                    }}
                  >
                    +1 (954) 955-8861
                  </p>
                </div>
                <div style={{ borderTop: "1px solid rgba(30,21,23,0.18)", paddingTop: "22px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(30,21,23,0.62)",
                      marginBottom: "12px",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Cordoba
                  </span>
                  <p
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.55,
                      color: "#1e1517",
                      fontFamily: '"Onest", sans-serif',
                      margin: 0,
                    }}
                  >
                    Where artists, studios and works begin.
                  </p>
                </div>
                <div style={{ borderTop: "1px solid rgba(30,21,23,0.18)", paddingTop: "22px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(30,21,23,0.62)",
                      marginBottom: "12px",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Plantation, FL
                  </span>
                  <p
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.55,
                      color: "#1e1517",
                      fontFamily: '"Onest", sans-serif',
                      margin: 0,
                    }}
                  >
                    Where collectors, galleries and opportunities meet.
                  </p>
                </div>
                <div style={{ borderTop: "1px solid rgba(30,21,23,0.18)", paddingTop: "22px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(30,21,23,0.62)",
                      marginBottom: "12px",
                      fontFamily: '"Onest", sans-serif',
                    }}
                  >
                    Follow us
                  </span>
                  <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                    <a
                      href="#"
                      className="border-b border-solid border-transparent pb-px transition-colors hover:border-[#1e1517]"
                      style={{
                        fontSize: "12px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#1e1517",
                        textDecoration: "none",
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      Instagram
                    </a>
                    <a
                      href="#"
                      className="border-b border-solid border-transparent pb-px transition-colors hover:border-[#1e1517]"
                      style={{
                        fontSize: "12px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#1e1517",
                        textDecoration: "none",
                        fontFamily: '"Onest", sans-serif',
                      }}
                    >
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          {/* 4. Dark CTA */}
          <section
            style={{
              minHeight: isMobile ? "auto" : "52vh",
              backgroundImage:
                "radial-gradient(circle at 78% 18%, rgba(127,178,209,0.14), transparent 32%), linear-gradient(135deg, #1e1517, #120d0f)",
              color: "#fcf8ea",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: isMobile ? "50px 20px" : "80px 24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#7FB2D1",
                  display: "block",
                  marginBottom: "28px",
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                Argentina to the world
              </span>
              <h2
                style={{
                  fontFamily: '"Onest", sans-serif',
                  fontSize: "clamp(42px, 6vw, 92px)",
                  fontWeight: 700,
                  lineHeight: 1,
                  maxWidth: "900px",
                  margin: "0 auto",
                  color: "#fcf8ea",
                }}
              >
                <span style={{ display: "block" }}>One conversation can start the</span>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: '"BestDB", "Caveat", cursive',
                    fontWeight: 400,
                    color: "#7FB2D1",
                    transform: "rotate(-4deg)",
                    transformOrigin: "left center",
                  }}
                >
                  crossing.
                </span>
              </h2>
              <p
                style={{
                  margin: "30px auto 0",
                  maxWidth: "570px",
                  color: "rgba(252,248,234,0.68)",
                  fontSize: "15px",
                  lineHeight: 1.8,
                  fontFamily: '"Onest", sans-serif',
                }}
              >
                From artwork inquiries to international collaborations, we create the professional
                structure that lets Argentine art travel further.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ContactoPage;
