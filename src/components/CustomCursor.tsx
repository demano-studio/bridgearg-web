import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Disable custom cursor on touch devices.
    // This runs only on the client (useEffect), so window/navigator are safe to reference.
    setIsTouchDevice(
      "ontouchstart" in window || (navigator?.maxTouchPoints ?? 0) > 0
    );

    // Ensure we don't keep the cursor visible on touch devices.
    setIsVisible(false);
  }, []);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const addHoverListeners = () => {
      const clickableElements = document.querySelectorAll(
        'a, button, [role="button"], input, textarea, select, [data-clickable]'
      );
      
      clickableElements.forEach((el) => {
        el.addEventListener("mouseenter", () => setIsHovering(true));
        el.addEventListener("mouseleave", () => setIsHovering(false));
      });
    };

    window.addEventListener("mousemove", updateMousePosition);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Initial setup and observe for DOM changes
    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      observer.disconnect();
    };
  }, []);

  if (isTouchDevice) {
    return null;
  }

  return (
    <>
      {/* Main cursor dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[990] mix-blend-difference"
        animate={{
          x: mousePosition.x - (isHovering ? 20 : 6),
          y: mousePosition.y - (isHovering ? 20 : 6),
          scale: isVisible ? 1 : 0,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 28,
          mass: 0.5,
        }}
      >
        <motion.div
          className="rounded-full bg-white"
          animate={{
            width: isHovering ? 40 : 12,
            height: isHovering ? 40 : 12,
            opacity: isHovering ? 0.8 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        />
      </motion.div>

      {/* Outer ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[989]"
        animate={{
          x: mousePosition.x - 20,
          y: mousePosition.y - 20,
          scale: isVisible ? 1 : 0,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 15,
          mass: 0.1,
        }}
      >
        <motion.div
          className="w-10 h-10 rounded-full border border-foreground/30"
          animate={{
            scale: isHovering ? 1.5 : 1,
            opacity: isHovering ? 0 : 0.5,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        />
      </motion.div>

      {/* Global style to hide default cursor */}
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          * {
            cursor: none !important;
          }
          button, a, [role="button"], input, textarea, select {
            cursor: none !important;
          }
        }
      `}</style>
    </>
  );
};
