import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

const proposalUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  timeline: z.string().max(100).optional(),
  pricing: z.number().min(0).optional(),
  pricingBreakdown: z
    .object({
      baseRate: z.number(),
      hoursEstimated: z.number(),
      complexityMultiplier: z.number(),
      total: z.number(),
    })
    .optional(),
  terms: z.string().max(5000).nullable().optional(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED"]).optional(),
  client: z
    .object({
      name: z.string().min(1).max(200),
      email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      company: z.string().max(200).optional(),
    })
    .optional(),
  scopeItems: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().default(""),
        confidence: z.enum(["high", "medium", "low"]).optional(),
        hours: z.number().positive().nullable().optional(),
        rate: z.number().positive().nullable().optional(),
      })
    )
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDemoUser();
    const proposal = await prisma.proposal.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        client: true,
        scopeItems: { orderBy: { order: "asc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Get proposal error:", error);
    return NextResponse.json({ error: "Failed to load proposal" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const data = proposalUpdateSchema.parse(body as object);
    const user = await getDemoUser();

    const existing = await prisma.proposal.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    let clientId: string | null = existing.clientId;
    if (data.client) {
      const client = await prisma.client.upsert({
        where: { email: data.client.email },
        update: { name: data.client.name, company: data.client.company ?? null },
        create: {
          name: data.client.name,
          email: data.client.email,
          company: data.client.company,
        },
      });
      clientId = client.id;
    }

    await prisma.$transaction(async (tx) => {
      await tx.proposal.update({
        where: { id: params.id },
        data: {
          title: data.title,
          timeline: data.timeline,
          pricing: data.pricing,
          pricingBreakdown: data.pricingBreakdown,
          terms: data.terms === undefined ? undefined : data.terms,
          status: data.status,
          sentAt: data.status === undefined ? undefined : data.status === "SENT" && !existing.sentAt ? new Date() : data.status === "SENT" ? existing.sentAt : undefined,
          viewedAt: data.status === undefined ? undefined : data.status === "VIEWED" && !existing.viewedAt ? new Date() : data.status === "VIEWED" ? existing.viewedAt : undefined,
          acceptedAt: data.status === undefined ? undefined : data.status === "ACCEPTED" && !existing.acceptedAt ? new Date() : data.status === "ACCEPTED" ? existing.acceptedAt : undefined,
          rejectedAt: data.status === undefined ? undefined : data.status === "REJECTED" && !existing.rejectedAt ? new Date() : data.status === "REJECTED" ? existing.rejectedAt : undefined,
          clientId,
        },
      });

      if (data.scopeItems) {
        const current = await tx.proposalScopeItem.findMany({
          where: { proposalId: params.id },
        });
        const incomingIds = data.scopeItems
          .map((s) => s.id)
          .filter((id): id is string => Boolean(id));

        await tx.proposalScopeItem.deleteMany({
          where: { proposalId: params.id, id: { notIn: incomingIds } },
        });

        for (let i = 0; i < data.scopeItems.length; i++) {
          const item = data.scopeItems[i];
          if (item.id && current.some((c) => c.id === item.id)) {
            await tx.proposalScopeItem.update({
              where: { id: item.id },
              data: {
                title: item.title,
                description: item.description ?? "",
                confidence: item.confidence ?? "medium",
                hours: item.hours === undefined ? null : item.hours,
                rate: item.rate === undefined ? null : item.rate,
                order: i,
              },
            });
          } else {
            await tx.proposalScopeItem.create({
              data: {
                proposalId: params.id,
                title: item.title,
                description: item.description ?? "",
                confidence: item.confidence ?? "medium",
                hours: item.hours === undefined ? null : item.hours,
                rate: item.rate === undefined ? null : item.rate,
                order: i,
              },
            });
          }
        }
      }
    });

    if (data.status && data.status !== existing.status) {
      const actionMap: Record<string, string> = {
        SENT: "sent",
        VIEWED: "viewed",
        ACCEPTED: "accepted",
        REJECTED: "rejected",
      };
      await prisma.activityLog.create({
        data: {
          action: actionMap[data.status] || "status-changed",
          proposalId: params.id,
          userId: user.id,
          metadata: { from: existing.status, to: data.status },
        },
      });
    } else {
      await prisma.activityLog.create({
        data: { action: "edited", proposalId: params.id, userId: user.id },
      });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: { client: true, scopeItems: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Update proposal error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDemoUser();
    const existing = await prisma.proposal.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    await prisma.proposal.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete proposal error:", error);
    return NextResponse.json({ error: "Failed to delete proposal" }, { status: 500 });
  }
}