import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudentsClient from "./StudentsClient";

export default async function MasterStudentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const students = await prisma.masterStudent.findMany({
    include: {
      institution: { select: { name: true, code: true, zone: { select: { name: true } } } }
    },
    take: 300,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Master Students UID Registry</h1>
        <p className="page-description">
          Upload and manage global enrolled student UID database across all 80+ colleges.
        </p>
      </div>

      <StudentsClient initialStudents={students} />
    </div>
  );
}
