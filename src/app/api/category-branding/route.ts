import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "MEDIA"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId, posterBgUrl } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ success: false, error: "categoryId required" }, { status: 400 });
    }

    // Zone admins can only update their own event's categories, super admins can update all
    const userEventId = session.user.eventId;
    if (session.user.role !== "SUPER_ADMIN" && userEventId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { eventId: true } });
      if (!cat || cat.eventId !== userEventId) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: { posterBgUrl: posterBgUrl || null }
    });

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("category-branding error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
