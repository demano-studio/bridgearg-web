import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import TermsContent from "@/components/legal/TermsContent";
import PrivacyContent from "@/components/legal/PrivacyContent";
import "@/styles/legal.css";

type LegalTab = "terms" | "privacy";

type TocItem = {
  id: string;
  number: string;
  title: string;
};

const TABS: Array<{ id: LegalTab; label: string }> = [
  { id: "terms", label: "Terms & Conditions" },
  { id: "privacy", label: "Privacy Policy" },
];

/** Dates mirrored from TermsContent / PrivacyContent (source of truth unchanged). */
const EFFECTIVE_DATE = "May 20, 2026";
const LAST_UPDATED = "May 20, 2026";

function parseLegalHash(hash: string): { tab: LegalTab; sectionId: string | null } | null {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) return null;
  if (raw === "terms" || raw === "privacy") {
    return { tab: raw, sectionId: null };
  }
  const match = /^(terms|privacy)-(\d+)$/.exec(raw);
  if (!match) return null;
  return { tab: match[1] as LegalTab, sectionId: raw };
}

function formatSectionNumber(id: string, headingText: string): string {
  const fromId = id.match(/(?:terms|privacy)-(\d+)$/);
  const n = fromId?.[1] ?? headingText.match(/^(\d+)\./)?.[1] ?? "";
  if (!n) return "";
  return n.padStart(2, "0");
}

function stripLeadingNumber(headingText: string): string {
  return headingText.replace(/^\d+\.\s*/, "").trim();
}

const LegalPage = () => {
  const location = useLocation();
  const docRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<LegalTab>("terms");
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const pendingSectionRef = useRef<string | null>(null);

  const getStickyOffset = useCallback(() => {
    const headerRaw = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
    const headerH = Number.parseInt(headerRaw, 10);
    const header = Number.isFinite(headerH) ? headerH : 80;
    const tabsH = tabsRef.current?.offsetHeight ?? 64;
    return header + tabsH + 18;
  }, []);

  const replaceHash = useCallback((hash: string) => {
    const next = hash.startsWith("#") ? hash : `#${hash}`;
    if (`${location.pathname}${location.hash}` === `/legal${next}`) return;
    window.history.replaceState(null, "", `/legal${next}`);
  }, [location.hash, location.pathname]);

  const scrollToSection = useCallback(
    (sectionId: string, behavior: ScrollBehavior = "smooth") => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - getStickyOffset();
      window.scrollTo({ top: Math.max(top, 0), behavior });
      setActiveSectionId(sectionId);
      replaceHash(sectionId);
    },
    [getStickyOffset, replaceHash],
  );

  const selectTab = useCallback(
    (tab: LegalTab, options?: { sectionId?: string | null; updateHash?: boolean }) => {
      const sectionId = options?.sectionId ?? null;
      pendingSectionRef.current = sectionId;
      setActiveTab(tab);
      setActiveSectionId(sectionId);
      if (options?.updateHash !== false) {
        replaceHash(sectionId ?? tab);
      }
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [replaceHash],
  );

  // Initial / hash-driven navigation
  useEffect(() => {
    const parsed = parseLegalHash(location.hash);
    if (!parsed) {
      if (!location.hash) replaceHash("terms");
      return;
    }
    selectTab(parsed.tab, { sectionId: parsed.sectionId, updateHash: false });
  }, [location.hash]); // eslint-disable-line react-hooks/exhaustive-deps -- respond to hash only

  // Build TOC from the active document's h3[id] headings
  useLayoutEffect(() => {
    const root = docRef.current;
    if (!root) {
      setTocItems([]);
      return;
    }

    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h3[id]"));
    const items: TocItem[] = headings.map((h) => {
      const text = (h.textContent ?? "").trim();
      return {
        id: h.id,
        number: formatSectionNumber(h.id, text),
        title: stripLeadingNumber(text),
      };
    });
    setTocItems(items);

    const pending = pendingSectionRef.current;
    pendingSectionRef.current = null;

    if (pending) {
      requestAnimationFrame(() => scrollToSection(pending, "smooth"));
      return;
    }

    if (items[0] && !activeSectionId) {
      setActiveSectionId(items[0].id);
    }
  }, [activeTab, scrollToSection]); // eslint-disable-line react-hooks/exhaustive-deps -- rebuild TOC on tab change

  // Scrollspy on section headings
  useEffect(() => {
    const root = docRef.current;
    if (!root || tocItems.length === 0) return;

    const offset = getStickyOffset();
    const headings = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      {
        threshold: [0.1, 0.25, 0.5, 0.75],
        rootMargin: `-${offset}px 0px -55% 0px`,
      },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocItems, getStickyOffset]);

  const activeTabLabel = useMemo(
    () => TABS.find((t) => t.id === activeTab)?.label ?? "Document",
    [activeTab],
  );

  return (
    <PageTransition>
      <div className="legal-page">
        <SEO
          title="Terms & Privacy"
          description="Read BridgeArg legal terms and privacy policy."
          url="/legal"
        />
        <Header />
        <main>
          <header className="legal-hero">
            <div className="legal-wrap">
              <p className="legal-hero__eyebrow">(Legal)</p>
              <h1 className="legal-hero__title">
                Terms &amp; <span className="legal-hero__script">privacy.</span>
              </h1>
              <ul className="legal-hero__meta">
                <li>
                  <strong>Effective date</strong>
                  {EFFECTIVE_DATE}
                </li>
                <li>
                  <strong>Last updated</strong>
                  {LAST_UPDATED}
                </li>
              </ul>
            </div>
          </header>

          <nav className="legal-tabs" ref={tabsRef} aria-label="Legal documents">
            <div className="legal-wrap legal-tabs__inner" role="tablist">
              {TABS.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    data-no-pill
                    id={`legal-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`legal-panel-${tab.id}`}
                    className={`legal-tabs__btn${selected ? " is-active" : ""}`}
                    onClick={() => selectTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="legal-wrap legal-body">
            <aside className="legal-toc" aria-label={`${activeTabLabel} sections`}>
              <p className="legal-toc__label">On this page</p>
              <ul className="legal-toc__list">
                {tocItems.map((item) => {
                  const isActive = activeSectionId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-no-pill
                        className={`legal-toc__link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "true" : undefined}
                        onClick={() => scrollToSection(item.id)}
                      >
                        <span className="legal-toc__num" aria-hidden="true">
                          {item.number}
                        </span>
                        <span className="legal-toc__title">{item.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div
              className="legal-doc"
              ref={docRef}
              role="tabpanel"
              id={`legal-panel-${activeTab}`}
              aria-labelledby={`legal-tab-${activeTab}`}
            >
              {activeTab === "terms" ? <TermsContent /> : <PrivacyContent />}
            </div>
          </div>

          <section className="legal-close" data-cursor-theme="dark">
            <div className="legal-wrap legal-close__inner">
              <p className="legal-close__eyebrow">(Legal)</p>
              <h2 className="legal-close__title">Questions about our policies?</h2>
              <Link to="/contact" className="legal-close__btn">
                Start the conversation <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default LegalPage;
