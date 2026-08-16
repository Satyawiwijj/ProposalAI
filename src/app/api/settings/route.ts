import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

const settingsSchema = z.object({
  companyName: z.string().max(200).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  defaultCurrency: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  defaultTimeline: z.string().max(50).optional(),
  hourlyRate: z.number().min(0).optional(),
  complexityMultiplier: z.number().min(0).optional(),
  numberingScheme: z.string().max(50).optional(),
  defaultTerms: z.string().max(10000).nullable().optional(),
  emailProvider: z.string().max(50).nullable().optional(),
  emailApiKey: z.string().max(500).nullable().optional(),
  emailFromAddress: z.string().max(200).nullable().optional(),
  emailFromName: z.string().max(200).nullable().optional(),
  notifyProposalViewed: z.boolean().optional(),
  notifyProposalAccepted: z.boolean().optional(),
  notifyProposalRejected: z.boolean().optional(),
  notifyWeeklyDigest: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getDemoUser();
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const data = settingsSchema.parse(body as object);
    const user = await getDemoUser();

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Update settings error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}