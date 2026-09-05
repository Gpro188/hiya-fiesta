"use client";

import { useState } from "react";
import { deleteEvent } from "./actions";
import Link from "next/link";
import EditEventModal from "./EditEventModal";

type EventType = {
  id: string;
  name: string;
  createdAt: Date;
  _count: {
    programs: number;
    teams: number;
  };
};

export default function EventList({ events }: { events: EventType[] }) {
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  if (events.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No events created yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {events.map((event) => (
        <div key={event.id} style={{ 
          padding: 'var(--spacing-md)', 
          border: '1px solid #e2e8f0', 
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{event.name}</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {event._count.teams} Teams • {event._count.programs} Programs
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Link href={`/dashboard/events/${event.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
              Manage
            </Link>
            <button 
              onClick={() => setEditingEvent(event)}
              className="btn btn-secondary" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
            >
              Edit
            </button>
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete this event?')) {
                  deleteEvent(event.id);
                }
              }}
              className="btn btn-secondary" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {editingEvent && (
        <EditEventModal 
          event={editingEvent} 
          onClose={() => setEditingEvent(null)} 
        />
      )}
    </div>
  );
}
