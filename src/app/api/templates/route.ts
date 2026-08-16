import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getDemoUser();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const templates = await prisma.template.findMany({
      where: {
        OR: [{ isPublic: true }, { userId: user.id }],
        ...(category && category !== "All" ? { category: category.toLowerCase() } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { usageCount: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("List templates error:", error);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}