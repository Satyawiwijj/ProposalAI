import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getDemoUser();
    const [rows, activityLast7Days] = await Promise.all([
      prisma.proposal.findMany({
        where: { userId: user.id },
        select: { status: true, sentAt: true, viewedAt: true, acceptedAt: true },
      }),
      prisma.activityLog.count({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    const drafts = rows.filter((r) => r.status === "DRAFT").length;
    const sent = rows.filter((r) => r.sentAt !== null).length;
    const viewed = rows.filter((r) => r.viewedAt !== null).length;
    const won = rows.filter((r) => r.acceptedAt !== null).length;
    return NextResponse.json({
      funnel: { drafts, sent, viewed, won },
      activityLast7Days,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
