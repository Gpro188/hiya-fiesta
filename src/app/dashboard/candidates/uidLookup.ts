"use server";

import { prisma } from "@/lib/prisma";

export async function lookupStudentByUID(uid: string, teamId?: string) {
  try {
    if (!uid || uid.trim().length < 3) return { success: false, student: null };

    const cleanUid = uid.trim();
    const student = await prisma.masterStudent.findUnique({
      where: { uid: cleanUid },
      include: {
        institution: { select: { id: true, name: true, code: true } }
      }
    });

    let currentTeamInstitutionId: string | null = null;
    let currentTeamInstitutionName: string | null = null;

    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { institutionId: true, institution: { select: { id: true, name: true } } }
      });
      if (team) {
        currentTeamInstitutionId = team.institutionId;
        currentTeamInstitutionName = team.institution?.name || null;
      }
    }

    if (!student) {
      return { 
        success: false, 
        student: null, 
        notFound: true,
        error: "Student UID not found in institution directory. If there is an issue in the institution portal (admission or promotion procedure not completed for this student), please contact the IT Cell of CSWC." 
      };
    }

    // Check if student belongs to a different institution
    const isDifferentInstitution = Boolean(
      currentTeamInstitutionId && 
      student.institutionId && 
      currentTeamInstitutionId !== student.institutionId
    );

    if (isDifferentInstitution) {
      return {
        success: false,
        student,
        isDifferentInstitution: true,
        studentInstitutionName: student.institution?.name,
        error: `Student (${cleanUid} - ${student.name}) is registered under "${student.institution?.name}". If there is an issue in the institution portal (admission or promotion procedure not completed for this student), please contact the IT Cell of CSWC.`
      };
    }

    const candidateWhere: any = { uid: cleanUid };
    if (teamId) {
      candidateWhere.teamId = teamId;
    }
    const existingCandidate = await prisma.candidate.findFirst({
      where: candidateWhere
    });

    return { 
      success: true, 
      student, 
      isAlreadyRegistered: !!existingCandidate,
      existingCandidateName: existingCandidate?.name
    };
  } catch (error) {
    console.error("UID Lookup error:", error);
    return { success: false, student: null, error: "UID Lookup Failed" };
  }
}
