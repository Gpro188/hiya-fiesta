"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setCount(Math.round(eased * target));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export function StatCard({
  value,
  label,
  isGold = false,
}: {
  value: number;
  label: string;
  isGold?: boolean;
}) {
  const { count, ref } = useCountUp(value);

  return (
    <div className="hf-stat-card" ref={ref}>
      <div className={`hf-stat-num${isGold ? " hf-stat-gold" : ""}`}>
        {count.toLocaleString()}
      </div>
      <div className="hf-stat-label">{label}</div>
    </div>
  );
}
