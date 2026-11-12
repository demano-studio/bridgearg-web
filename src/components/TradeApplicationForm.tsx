import { useId, useState, type FormEvent } from "react";
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

const PROJECT_TYPE_OPTIONS = [
  "Residential",
  "Hospitality",
  "Commercial / office",
  "Multi-family / development",
  "Other",
] as const;

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
      <div className="trade-corners">
        <div className="trade-form" role="status" aria-live="polite">
          <p className="trade-form__success">Thank you, we'll be in touch within 48 business hours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-corners">
      <form className="trade-form" onSubmit={handleSubmit} noValidate>
        <div aria-live="polite" className="sr-only">
          {status === "loading" ? "Submitting application" : ""}
          {status === "error" && error ? error : ""}
        </div>

        <input
          type="text"
          name="website_hp"
          value={websiteHp}
          onChange={(e) => setWebsiteHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
          style={{
            position: "absolute",
            left: "-10000px",
            top: "auto",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        />

        <div className="trade-form__fields">
          <div className="trade-field">
            <label htmlFor={`${formId}-name`}>Full name</label>
            <input
              id={`${formId}-name`}
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={status === "loading"}
            />
          </div>

          <div className="trade-field">
            <label htmlFor={`${formId}-email`}>Email</label>
            <input
              id={`${formId}-email`}
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
            />
          </div>

          <div className="trade-field">
            <label htmlFor={`${formId}-company`}>Studio or company</label>
            <input
              id={`${formId}-company`}
              type="text"
              required
              maxLength={160}
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={status === "loading"}
            />
          </div>

          <div className="trade-field">
            <label htmlFor={`${formId}-role`}>You are</label>
            <select
              id={`${formId}-role`}
              required
              value={role}
              onChange={(e) => setRole(e.target.value as TradeRole | "")}
              disabled={status === "loading"}
            >
              <option value="">Select your role</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="trade-field">
            <label htmlFor={`${formId}-website`}>Website or Instagram (optional)</label>
            <input
              id={`${formId}-website`}
              type="text"
              maxLength={300}
              autoComplete="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={status === "loading"}
              placeholder="https://… or @studio"
            />
          </div>

          <div className="trade-field">
            <label htmlFor={`${formId}-project`}>Project type (optional)</label>
            <select
              id={`${formId}-project`}
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              disabled={status === "loading"}
            >
              <option value="">Select if relevant</option>
              {PROJECT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="trade-field">
            <label htmlFor={`${formId}-message`}>Tell us about your current or upcoming projects</label>
            <textarea
              id={`${formId}-message`}
              maxLength={2000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === "loading"}
            />
          </div>

          <label
            htmlFor={`${formId}-marketing`}
            className="trade-consent"
            style={{ cursor: status === "loading" ? "not-allowed" : "pointer" }}
          >
            <input
              id={`${formId}-marketing`}
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              disabled={status === "loading"}
            />
            <span>
              I agree to receive occasional emails from BridgeArg about the Trade Program and new works.
            </span>
          </label>

          {status === "error" && error ? (
            <p role="alert" aria-live="assertive" className="trade-form__error">
              {error}
            </p>
          ) : null}

          <div className="trade-form__foot">
            <button
              type="submit"
              className="trade-btn"
              disabled={status === "loading"}
              aria-busy={status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                <>
                  Apply to the Trade Program <span className="arrow" aria-hidden="true">→</span>
                </>
              )}
            </button>
            <small>We reply within 48 business hours.</small>
          </div>
        </div>
      </form>
    </div>
  );
}
