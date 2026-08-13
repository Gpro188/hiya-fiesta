'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type SessionType = 'ZONE' | 'STATE';

interface SessionContextType {
  activeSession: SessionType;
  setActiveSession: (session: SessionType) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<SessionType>('ZONE');

  // Load from local storage if available so refresh doesn't jump back to ZONE
  useEffect(() => {
    const saved = localStorage.getItem('cswc_admin_session');
    if (saved === 'STATE') {
      setActiveSession('STATE');
    }
  }, []);

  const handleSetSession = (session: SessionType) => {
    setActiveSession(session);
    localStorage.setItem('cswc_admin_session', session);
  };

  return (
    <SessionContext.Provider value={{ activeSession, setActiveSession: handleSetSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
