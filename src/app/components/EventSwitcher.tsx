"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

export default function EventSwitcher({ events, activeEventId }: { events: any[], activeEventId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSwitch = (eventId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (eventId) {
      params.set("eventId", eventId);
    } else {
      params.delete("eventId");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Center the active element on load
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-active="true"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeEventId]);

  return (
    <div className="event-switcher-wrapper">
      <div 
        ref={scrollRef}
        className="event-switcher-scroll"
      >
        {events.map(event => (
          <button
            key={event.id}
            data-active={activeEventId === event.id}
            onClick={() => handleSwitch(event.id)}
            className={`event-switch-btn ${activeEventId === event.id ? 'active' : ''}`}
            style={event.isCollab ? {
              background: activeEventId === event.id 
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' 
                : 'rgba(245, 158, 11, 0.12)',
              color: activeEventId === event.id ? '#ffffff' : '#d97706',
              border: activeEventId === event.id ? '1.5px solid #b45309' : '1.5px solid rgba(245, 158, 11, 0.4)',
              fontWeight: 800,
              boxShadow: activeEventId === event.id ? '0 4px 14px rgba(217, 119, 6, 0.35)' : 'none'
            } : undefined}
          >
            {event.name}
          </button>
        ))}
      </div>

      <style jsx>{`
        .event-switcher-wrapper {
          position: relative;
          margin-bottom: var(--spacing-lg);
          padding: 4px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          max-width: 100%;
          overflow: hidden;
          align-self: flex-start;
        }

        .event-switcher-scroll {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none;  /* IE/Edge */
          scroll-snap-type: x mandatory;
          padding: 2px;
        }

        .event-switcher-scroll::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        .event-switch-btn {
          white-space: nowrap;
          padding: 0.6rem 1.8rem;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.9rem;
          scroll-snap-align: center;
        }

        .event-switch-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .event-switch-btn.active {
          background: var(--primary);
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transform: scale(1.02);
        }

        @media (max-width: 768px) {
          .event-switcher-wrapper {
            width: 100%;
            border-radius: var(--radius-lg);
          }
          .event-switch-btn {
            padding: 0.5rem 1.2rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}

