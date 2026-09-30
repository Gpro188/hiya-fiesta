import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InstitutionsClient from "./InstitutionsClient";

export default async function MasterInstitutionsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const institutions = await prisma.masterInstitution.findMany({
    include: {
      zone: { select: { name: true, code: true } },
      _count: { select: { students: true, candidates: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const zones = await prisma.zone.findMany({
    select: { id: true, name: true, code: true }
  });

  return (
    <div className="animate-fade-in">
      <InstitutionsClient initialInstitutions={institutions} zones={zones} />
    </div>
  );
}
