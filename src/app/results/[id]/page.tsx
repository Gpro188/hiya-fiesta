import { getProgramResults } from "@/app/actions/public";
import ProgramResultsView from "@/app/components/ProgramResultsView";
import PublicNav from "@/app/components/PublicNav";
import PublicFooter from "@/app/components/PublicFooter";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const revalidate = 60;

export default async function ProgramResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { id } = await params;
  const { eventId } = await searchParams;
  const res = await getProgramResults(id, eventId);
  const session = await getServerSession(authOptions);

  if (!res.success || !res.data) {
    notFound();
  }

  const { program, settings: rawSettings } = res.data;

  if (!program) {
    notFound();
  }

  const userRole = session?.user?.role;
  const settings = rawSettings || { festName: "Arts Fest", festMoto: "", festLogo: null };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#FFF8FA",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <PublicNav eventName={program.event?.name || settings.festName} />

      <main style={{ flex: 1, padding: "2.5rem 0" }}>
        <div className="container">
          <ProgramResultsView program={program} settings={settings} userRole={userRole} eventId={eventId} />
        </div>
      </main>

      <PublicFooter eventName={program.event?.name || settings.festName} />
    </div>
  );
}
