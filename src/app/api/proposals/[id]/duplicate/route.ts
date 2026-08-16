import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDemoUser();
    const source = await prisma.proposal.findFirst({
      where: { id: params.id, userId: user.id },
      include: { client: true, scopeItems: true },
    });
    if (!source) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const copy = await prisma.proposal.create({
      data: {
        title: `${source.title} (Copy)`,
        status: "DRAFT",
        timeline: source.timeline,
        pricing: source.pricing,
        pricingBreakdown: source.pricingBreakdown as object,
        terms: source.terms,
        userId: user.id,
        clientId: source.clientId,
        scopeItems: {
          create: source.scopeItems.map((s) => ({
            title: s.title,
            description: s.description,
            confidence: s.confidence,
            hours: s.hours,
            rate: s.rate,
            order: s.order,
          })),
        },
        activityLogs: { create: { action: "created", userId: user.id } },
      },
      include: { client: true, scopeItems: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ proposal: copy }, { status: 201 });
  } catch (error) {
    console.error("Duplicate proposal error:", error);
    return NextResponse.json({ error: "Failed to duplicate proposal" }, { status: 500 });
  }
}