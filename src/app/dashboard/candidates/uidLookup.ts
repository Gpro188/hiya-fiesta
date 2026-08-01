"use server";

import { prisma } from "@/lib/prisma";

export async function lookupStudentByUID(uid: string) {
  try {
    if (!uid || uid.trim().length < 3) return { success: false, student: null };

    const student = await prisma.masterStudent.findUnique({
      where: { uid: uid.trim() },
      include: {
        institution: { select: { id: true, name: true, code: true } }
      }
    });

    if (!student) {
      return { success: false, student: null, error: "UID not found in Master Directory" };
    }

    return { success: true, student };
  } catch (error) {
    console.error("UID Lookup error:", error);
    return { success: false, student: null, error: "UID Lookup Failed" };
  }
}
