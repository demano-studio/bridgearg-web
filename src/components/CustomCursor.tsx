import { useEffect, useRef, useState } from "react";

type CursorMode = "base" | "dark" | "link" | "photo" | "input";

const LERP = 0.18;
const RING_SIZE = 36;

function resolveMode(target: EventTarget | null): CursorMode {
  if (!(target instanceof Element)) return "base";

  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    return "input";
  }
  // Native cursors inside image lightbox (zoom/pan); hide the custom cursor.
  if (target.closest(".yarl__root")) {
    return "input";
  }
  if (target.closest('[data-cursor="photo"]')) {
    return "photo";
  }
  if (target.closest('a, button, [role="button"], [data-cursor="link"]')) {
    return "link";
  }
  if (target.closest('[data-cursor-theme="dark"]')) {
    return "dark";
  }
  return "base";
}

function CustomCursorActive() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringWrapRef = useRef<HTMLDivElement>(null);
  const ringInnerRef = useRef<HTMLDivElement>(null);

  const mouseRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const modeRef = useRef<CursorMode>("base");
  const visibleRef = useRef(false);
  const readyRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const applyMode = (mode: CursorMode) => {
    modeRef.current = mode;
    const dot = dotRef.current;
    const ring = ringInnerRef.current;
    if (!dot || !ring) return;

    const hideCursor = mode === "input" || !visibleRef.current;
    const opacity = hideCursor ? "0" : "1";

    if (mode === "input") {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      return;
    }

    ring.style.opacity = opacity;

    if (mode === "link") {
      dot.style.opacity = "0";
      ring.style.transform = "translate(-50%, -50%) scale(1.56)";
      ring.style.borderColor = "#7fb2d1";
      ring.style.backgroundColor = "rgba(127, 178, 209, 0.35)";
      return;
    }

    if (mode === "photo") {
      dot.style.opacity = opacity;
      dot.style.backgroundColor = "#7fb2d1";
      ring.style.transform = "translate(-50%, -50%) scale(2)";
      ring.style.borderColor = "#7fb2d1";
      ring.style.backgroundColor = "rgba(127, 178, 209, 0.22)";
      return;
    }

    if (mode === "dark") {
      dot.style.opacity = opacity;
      dot.style.backgroundColor = "#7fb2d1";
      ring.style.transform = "translate(-50%, -50%) scale(1)";
      ring.style.borderColor = "rgba(127, 178, 209, 0.7)";
      ring.style.backgroundColor = "transparent";
      return;
    }

    // base
    dot.style.opacity = opacity;
    dot.style.backgroundColor = "#1e1517";
    ring.style.transform = "translate(-50%, -50%) scale(1)";
    ring.style.borderColor = "rgba(30, 21, 23, 0.45)";
    ring.style.backgroundColor = "transparent";
  };

  useEffect(() => {
    document.documentElement.classList.add("has-custom-cursor");

    const tick = () => {
      const mouse = mouseRef.current;
      const ringPos = ringPosRef.current;
      ringPos.x += (mouse.x - ringPos.x) * LERP;
      ringPos.y += (mouse.y - ringPos.y) * LERP;

      if (ringWrapRef.current) {
        ringWrapRef.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };

      if (!readyRef.current) {
        readyRef.current = true;
        ringPosRef.current = { x: event.clientX, y: event.clientY };
        visibleRef.current = true;
        applyMode(modeRef.current);
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      }
    };

    const onOver = (event: MouseEvent) => {
      applyMode(resolveMode(event.target));
    };

    const onLeave = () => {
      visibleRef.current = false;
      applyMode(modeRef.current);
    };

    const onEnter = () => {
      if (!readyRef.current) return;
      visibleRef.current = true;
      applyMode(modeRef.current);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="custom-cursor__dot"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "#1e1517",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.2s ease",
          willChange: "transform, opacity",
        }}
      />
      <div
        ref={ringWrapRef}
        aria-hidden
        className="custom-cursor__ring-wrap"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          width: 0,
          height: 0,
          pointerEvents: "none",
          willChange: "transform",
        }}
      >
        <div
          ref={ringInnerRef}
          className="custom-cursor__ring"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: "50%",
            border: "1px solid rgba(30, 21, 23, 0.45)",
            backgroundColor: "transparent",
            transform: "translate(-50%, -50%) scale(1)",
            opacity: 0,
            transition:
              "transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease",
            willChange: "transform, opacity, background-color, border-color",
            boxSizing: "border-box",
          }}
        />
      </div>
    </>
  );
}

export const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      const next = finePointer.matches && !reducedMotion.matches;
      setEnabled(next);
      if (!next) {
        document.documentElement.classList.remove("has-custom-cursor");
      }
    };

    sync();
    finePointer.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      finePointer.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  if (!enabled) return null;
  return <CustomCursorActive />;
};
