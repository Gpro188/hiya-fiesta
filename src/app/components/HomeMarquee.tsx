"use client";

interface ZoneItem {
  id: string;
  name: string;
  badgeText: string;
}

export default function HomeMarquee({ zones }: { zones: ZoneItem[] }) {
  if (!zones || zones.length === 0) return null;

  const items = zones.map(z => ({
    text: `${z.name} — ${z.badgeText}`,
    isLive: z.badgeText === "LIVE NOW",
  }));

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="hf-marquee-strip">
      <div className="hf-marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className={`hf-marquee-item${item.isLive ? " hf-marquee-gold" : ""}`}>
            {item.text}
            <span className="hf-marquee-sep">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
