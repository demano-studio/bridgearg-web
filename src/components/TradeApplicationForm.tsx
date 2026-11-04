import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { applyTrade, type TradeRole } from "@/lib/api";
import { parseTradeRoleParam } from "@/data/tradeSegments";

const ROLE_OPTIONS: { value: TradeRole; label: string }[] = [
  { value: "interior_designer", label: "Interior designer" },
  { value: "architect", label: "Architect" },
  { value: "developer", label: "Real estate developer" },
  { value: "art_consultant", label: "Art consultant" },
  { value: "other", label: "Other" },
];

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
  fontFamily: '"Onest", sans-serif',
  padding: "8px 0",
};

const fieldWrapStyle: CSSProperties = {
  position: "relative",
  borderBottom: "1px solid rgba(30,21,23,0.18)",
  paddingBottom: "16px",
};

export function TradeApplicationForm({ defaultRole }: { defaultRole?: TradeRole } = {}) {
  const formId = useId();
  const [searchParams] = useSearchParams();
  const roleFromQuery = parseTradeRoleParam(searchParams.get("role"));
  const initialRole = defaultRole ?? roleFromQuery ?? "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [role, setRole] = useState<TradeRole | "">(initialRole);
  const [projectType, setProjectType] = useState("");
  const [message, setMessage] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [websiteHp, setWebsiteHp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    if (!role) {
      setStatus("error");
      setError("Please select your role");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setError("Please enter a valid email");
      return;
    }

    setStatus("loading");
    setError("");

    const result = await applyTrade({
      full_name: fullName.trim(),
      email: email.trim(),
      company: company.trim(),
      website: website.trim() || undefined,
      role,
      project_type: projectType.trim() || undefined,
      message: message.trim() || undefined,
      marketing,
      website_hp: websiteHp,
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("success");
    setFullName("");
    setEmail("");
    setCompany("");
    setWebsite("");
    setRole(initialRole);
    setProjectType("");
    setMessage("");
    setMarketing(false);
    setWebsiteHp("");
  };

  if (status === "success") {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{
          fontFamily: '"Onest", sans-serif',
          fontSize: "17px",
          lineHeight: 1.6,
          color: "#1e1517",
          border: "1px solid #7FB2D1",
          backgroundColor: "rgba(127,178,209,0.08)",
          padding: "24px",
        }}
      >
        Thank you, we'll be in touch within 48 business hours.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "26px" }} noValidate>
      <div aria-live="polite" className="sr-only">
        {status === "loading" ? "Submitting application" : ""}
        {status === "error" && error ? error : ""}
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website_hp"
        value={websiteHp}
        onChange={(e) => setWebsiteHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      />

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-name`} style={fieldLabelStyle}>
          Full name
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={status === "loading"}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={fieldControlStyle}
        />
      </div>

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-email`} style={fieldLabelStyle}>
          Email
        </label>
        <input
          id={`${formId}-email`}
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={fieldControlStyle}
        />
      </div>

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-company`} style={fieldLabelStyle}>
          Studio or company
        </label>
        <input
          id={`${formId}-company`}
          type="text"
          required
          maxLength={160}
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          disabled={status === "loading"}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={fieldControlStyle}
        />
      </div>

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-website`} style={fieldLabelStyle}>
          Website or Instagram <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <input
          id={`${formId}-website`}
          type="text"
          maxLength={300}
          autoComplete="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={status === "loading"}
          placeholder="https://… or @studio"
          className="placeholder:text-[rgba(30,21,23,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={fieldControlStyle}
        />
      </div>

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-role`} style={fieldLabelStyle}>
          Role
        </label>
        <select
          id={`${formId}-role`}
          required
          value={role}
          onChange={(e) => setRole(e.target.value as TradeRole | "")}
          disabled={status === "loading"}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={{ ...fieldControlStyle, cursor: "pointer" }}
        >
          <option value="">Select your role</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-project`} style={fieldLabelStyle}>
          Project type <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <input
          id={`${formId}-project`}
          type="text"
          maxLength={160}
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
          disabled={status === "loading"}
          placeholder="Residence, hotel, office…"
          className="placeholder:text-[rgba(30,21,23,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={fieldControlStyle}
        />
      </div>

      <div style={fieldWrapStyle}>
        <label htmlFor={`${formId}-message`} style={fieldLabelStyle}>
          Message <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          id={`${formId}-message`}
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === "loading"}
          className="placeholder:text-[rgba(30,21,23,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
          style={{ ...fieldControlStyle, resize: "vertical", minHeight: "100px" }}
        />
      </div>

      <label
        htmlFor={`${formId}-marketing`}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          cursor: status === "loading" ? "not-allowed" : "pointer",
          fontFamily: '"Onest", sans-serif',
          fontSize: "13px",
          lineHeight: 1.5,
          color: "rgba(30,21,23,0.72)",
        }}
      >
        <input
          id={`${formId}-marketing`}
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          disabled={status === "loading"}
          className="mt-1 h-4 w-4 accent-[#7FB2D1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB2D1]"
        />
        <span>
          I agree to receive occasional emails from BridgeArg about the Trade Program and new works.
        </span>
      </label>

      {status === "error" && error ? (
        <p
          role="alert"
          aria-live="assertive"
          style={{
            fontFamily: '"Onest", sans-serif',
            fontSize: "14px",
            color: "#b42318",
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        className="inline-flex items-center justify-center gap-2 border border-[#7FB2D1] bg-[#7FB2D1] px-8 py-4 font-display text-xs uppercase tracking-[0.18em] text-[#1e1517] transition-colors hover:bg-[#7FB2D1]/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1517] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Submit application"
        )}
      </button>
    </form>
  );
}
