import { getHubData } from "../actions/hub";
import HubClient from "../components/HubClient";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import HubTourWrapper from "./HubTourWrapper";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function HubPage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  // Prioritize URL eventId, then logged-in user's eventId
  const activeEventId = searchParams.eventId || session?.user?.eventId || undefined;
  
  const settings = await getSettings(activeEventId);
  const res = await getHubData(activeEventId);
  const events = (res.success && res.data) ? res.data : [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 'var(--spacing-md) 0', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{settings.festName} <span style={{ color: 'var(--primary)', fontWeight: 400 }}>Hub</span></h1>
          </Link>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href="/search" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Search</Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: 'var(--spacing-xl) 0' }}>
        <div className="container">
          <HubClient events={events} />
        </div>
      </main>

      <footer style={{ padding: 'var(--spacing-xl) 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>
        <p>&copy; {new Date().getFullYear()} {settings.festName} Live Results. All rights reserved.</p>
      </footer>

      <HubTourWrapper />
    </div>
  );
}
