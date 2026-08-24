// Scroll-reveal primitives, custom IntersectionObserver, no animation library.
// Palette-aware (the motion is CSS transitions driven by a `.in-view` class), and it
// respects prefers-reduced-motion by revealing instantly. Same approach war-room-app took.

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.unobserve(e.target); // reveal once, then stop watching
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export function Reveal({
  children,
  delay = 0,
  as = "div",
  className = "",
  y = 26,
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
  y?: number;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  const Tag = as as ElementType;
  const style = {
    transform: inView ? "none" : `translateY(${y}px)`,
    opacity: inView ? 1 : 0,
    transition: `transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, opacity 0.7s ease ${delay}ms`,
  };
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}

// Tracks page scroll progress 0..1 for the hero parallax / scroll cue.
export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}
