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

    if (!student) {
      return { success: false, student: null, error: "UID not found in Master Directory" };
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
