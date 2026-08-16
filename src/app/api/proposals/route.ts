import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

const proposalCreateSchema = z.object({
  title: z.string().min(1).max(200),
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
  terms: z.string().max(5000).optional(),
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
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().default(""),
        confidence: z.enum(["high", "medium", "low"]).optional(),
        hours: z.number().positive().optional(),
        rate: z.number().positive().optional(),
      })
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getDemoUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const proposals = await prisma.proposal.findMany({
      where: {
        userId: user.id,
        ...(status && status !== "all" ? { status: status.toUpperCase() as never } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { scopeItems: { some: { title: { contains: search, mode: "insensitive" } } } },
                { client: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        client: true,
        scopeItems: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error("List proposals error:", error);
    return NextResponse.json({ error: "Failed to load proposals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const data = proposalCreateSchema.parse(body as object);
    const user = await getDemoUser();

    let clientId: string | null = null;
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

    const proposal = await prisma.proposal.create({
      data: {
        title: data.title,
        status: data.status ?? "DRAFT",
        timeline: data.timeline ?? "2 weeks",
        pricing: data.pricing ?? 0,
        pricingBreakdown: data.pricingBreakdown ?? { baseRate: 150, hoursEstimated: 0, complexityMultiplier: 1.0, total: 0 },
        terms: data.terms,
        userId: user.id,
        clientId,
        scopeItems: {
          create: data.scopeItems.map((item, i) => ({
            title: item.title,
            description: item.description ?? "",
            confidence: item.confidence ?? "medium",
            hours: item.hours,
            rate: item.rate,
            order: i,
          })),
        },
        activityLogs: { create: { action: "created", userId: user.id } },
      },
      include: { client: true, scopeItems: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error("Create proposal error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}