import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ZonesClient from "./ZonesClient";

export default async function MasterZonesPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const rawZones = await prisma.zone.findMany({
    include: {
      institutions: {
        select: {
          id: true,
          name: true,
          code: true,
          place: true,
          teams: {
            select: {
              id: true,
              isAssignmentsConfirmed: true,
              _count: { select: { candidates: true } }
            }
          }
        }
      },
      events: {
        select: {
          id: true,
          programs: {
            select: {
              id: true,
              _count: { select: { results: true } }
            }
          }
        }
      },
      _count: { select: { institutions: true, users: true } }
    },
    orderBy: { name: 'asc' }
  });

  const zones = rawZones.map(zone => {
    const totalInsts = zone.institutions.length;
    let registeredInsts = 0;
    let confirmedInsts = 0;
    let totalCandidates = 0;

    zone.institutions.forEach(inst => {
      const hasCandidates = inst.teams.some(t => t._count.candidates > 0);
      const isConfirmed = inst.teams.some(t => t.isAssignmentsConfirmed);
      if (hasCandidates) registeredInsts++;
      if (isConfirmed) confirmedInsts++;
      inst.teams.forEach(t => {
        totalCandidates += t._count.candidates;
      });
    });

    const registrationPercentage = totalInsts > 0 ? Math.round((registeredInsts / totalInsts) * 100) : 0;
    const confirmationPercentage = totalInsts > 0 ? Math.round((confirmedInsts / totalInsts) * 100) : 0;

    // Results percentage across zone events
    let totalPrograms = 0;
    let scoredPrograms = 0;
    zone.events.forEach(ev => {
      totalPrograms += ev.programs.length;
      scoredPrograms += ev.programs.filter(p => p._count.results > 0).length;
    });

    const resultsPercentage = totalPrograms > 0 ? Math.round((scoredPrograms / totalPrograms) * 100) : 0;

    return {
      ...zone,
      totalInstitutions: totalInsts,
      registeredInstitutions: registeredInsts,
      confirmedInstitutions: confirmedInsts,
      totalCandidates,
      registrationPercentage,
      confirmationPercentage,
      totalPrograms,
      scoredPrograms,
      resultsPercentage
    };
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Master Zones & Registration Progress</h1>
        <p className="page-description">
          Monitor real-time institution registration percentages, zone confirmation rates, result publication status, and perform festival test resets.
        </p>
      </div>

      <ZonesClient initialZones={zones} />
    </div>
  );
}
