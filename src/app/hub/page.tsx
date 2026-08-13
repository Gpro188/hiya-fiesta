import { getHubData } from "../actions/hub";
import HubClient from "../components/HubClient";
import { getSettings } from "@/lib/settings";
import HubTourWrapper from "./HubTourWrapper";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function HubPage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  const activeEventId = searchParams.eventId || session?.user?.eventId || undefined;
  
  const settings = await getSettings(activeEventId);
  const res = await getHubData(activeEventId);
  const events = (res.success && res.data) ? res.data : [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFF8FA', fontFamily: 'Manrope, sans-serif' }}>
      <PublicNav eventName={settings.festName} />

      <main style={{ flex: 1, padding: 'var(--spacing-xl) 0' }}>
        <div className="container">
          <HubClient events={events} />
        </div>
      </main>

      <PublicFooter eventName={settings.festName} />
      <HubTourWrapper />
    </div>
  );
}
