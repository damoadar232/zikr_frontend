import { useEffect, useRef, type ReactNode } from "react";

export function useReveal<T extends HTMLElement>(delay = 0) {
    const ref = useRef<T>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.setProperty("--reveal-delay", `${delay}ms`);
        if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            element.classList.add("is-revealed");
            return;
        }
        try {
            element.classList.add("reveal-pending");
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    element.classList.remove("reveal-pending");
                    element.classList.add("is-revealed");
                    observer.unobserve(element);
                }
            }, { threshold: 0.12, rootMargin: "0px 0px -36px" });
            observer.observe(element);
            return () => observer.disconnect();
        } catch {
            element.classList.remove("reveal-pending");
            element.classList.add("is-revealed");
        }
    }, [delay]);
    return ref;
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
    const ref = useReveal<HTMLDivElement>(delay);
    return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}