import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { submitContact } from "@/lib/api";

export const CONTACT_SUBJECT_OPTIONS = [
  "Artwork inquiry",
  "Artist representation",
  "Collector support",
  "Partnership",
  "Customer service",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECT_OPTIONS)[number];

type ContactFormProps = {
  initialSubject?: string;
  initialMessage?: string;
};

export function ContactForm({ initialSubject = "", initialMessage = "" }: ContactFormProps) {
  const formId = useId();
  const normalizedInitialSubject =
    initialSubject && (CONTACT_SUBJECT_OPTIONS as readonly string[]).includes(initialSubject)
      ? initialSubject
      : "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(normalizedInitialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [consent, setConsent] = useState(false);
  const [websiteHp, setWebsiteHp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    if (!fullName.trim()) {
      setStatus("error");
      setError("Please enter your full name");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setError("Please enter a valid email");
      return;
    }

    if (!subject || !(CONTACT_SUBJECT_OPTIONS as readonly string[]).includes(subject)) {
      setStatus("error");
      setError("Please select a subject");
      return;
    }

    if (!message.trim()) {
      setStatus("error");
      setError("Please enter a message");
      return;
    }

    if (!consent) {
      setStatus("error");
      setError("Please agree to the terms before submitting");
      return;
    }

    setStatus("loading");
    setError("");

    const result = await submitContact({
      full_name: fullName.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
      consent,
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
    setSubject(normalizedInitialSubject);
    setMessage(initialMessage);
    setConsent(false);
    setWebsiteHp("");
  };

  if (status === "success") {
    return (
      <div className="contact-form" role="status" aria-live="polite">
        <p className="contact-form__success">
          Thank you, we&apos;ll be in touch within 48 business hours.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div aria-live="polite" className="sr-only">
        {status === "loading" ? "Sending message" : ""}
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

      <div className="contact-form__fields">
        <div className="contact-field">
          <label htmlFor="contact-full-name">Full name</label>
          <input
            id="contact-full-name"
            name="full_name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={status === "loading"}
          />
        </div>

        <div className="contact-field">
          <label htmlFor={`${formId}-email`}>Email</label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
          />
        </div>

        <div className="contact-field contact-field--full">
          <label htmlFor={`${formId}-subject`}>Subject</label>
          <select
            id={`${formId}-subject`}
            name="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={status === "loading"}
          >
            <option value="">Select a subject</option>
            {CONTACT_SUBJECT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="contact-field contact-field--full">
          <label htmlFor={`${formId}-message`}>Message</label>
          <textarea
            id={`${formId}-message`}
            name="message"
            required
            maxLength={2000}
            rows={5}
            placeholder="Tell us what you are looking for"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === "loading"}
          />
        </div>

        <label
          htmlFor={`${formId}-consent`}
          className="contact-consent"
          style={{ cursor: status === "loading" ? "not-allowed" : "pointer" }}
        >
          <input
            id={`${formId}-consent`}
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={status === "loading"}
            required
          />
          <span>
            I have read and accept the{" "}
            <Link to="/legal#terms">Terms &amp; Conditions</Link> and{" "}
            <Link to="/legal#privacy">Privacy Policy</Link>, and I agree to receive occasional emails
            from BridgeArg.
          </span>
        </label>

        {status === "error" && error ? (
          <p role="alert" aria-live="assertive" className="contact-form__error">
            {error}
          </p>
        ) : null}

        <div className="contact-form__foot">
          <button
            type="submit"
            className="contact-form__btn"
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
                Send message <span className="arrow" aria-hidden="true">→</span>
              </>
            )}
          </button>
          <p className="contact-form__note">We reply within 48 business hours.</p>
        </div>
      </div>
    </form>
  );
}
