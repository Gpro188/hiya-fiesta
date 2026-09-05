"use server";

import { prisma } from "@/lib/prisma";

export async function lookupStudentByUID(uid: string, teamId?: string) {
  try {
    if (!uid || uid.trim().length < 3) return { success: false, student: null };

    const cleanUid = uid.trim();
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

    let student = null;
    if (currentTeamInstitutionId) {
      student = await prisma.masterStudent.findFirst({
        where: { 
          uid: { equals: cleanUid, mode: "insensitive" }, 
          institutionId: currentTeamInstitutionId 
        },
        include: {
          institution: { select: { id: true, name: true, code: true } }
        }
      });
    }

    if (!student) {
      // Check if this UID exists under ANY other college in the master directory
      const otherStudent = await prisma.masterStudent.findFirst({
        where: { uid: { equals: cleanUid, mode: "insensitive" } },
        include: {
          institution: { select: { id: true, name: true, code: true } }
        }
      });

      if (otherStudent) {
        return {
          success: false,
          student: otherStudent,
          isDifferentInstitution: true,
          studentInstitutionName: otherStudent.institution?.name,
          error: `Student (${cleanUid} - ${otherStudent.name}) is registered under "${otherStudent.institution?.name}". If there is an issue in the institution portal (admission or promotion procedure not completed for this student), please contact the IT Cell of CSWC.`
        };
      }

      return { 
        success: false, 
        student: null, 
        notFound: true,
        error: "Student UID not found in institution directory. If there is an issue in the institution portal (admission or promotion procedure not completed for this student), please contact the IT Cell of CSWC." 
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
