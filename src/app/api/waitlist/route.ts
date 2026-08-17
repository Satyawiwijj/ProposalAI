import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

const waitlistSchema = z.object({
  email: z.string().email().max(254).transform((v) => v.trim().toLowerCase()),
  name: z.string().max(100).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(`waitlist:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const data = waitlistSchema.parse(body as object);

    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json({ ok: true, existing: true, message: "Already on the list" });
    }

    await prisma.waitlistEntry.create({
      data: { email: data.email, name: data.name ?? null, source: data.source ?? null },
    });

    return NextResponse.json({ ok: true, existing: false, message: "Added to waitlist" }, { status: 201 });
  } catch (error) {
    console.error("Waitlist signup error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
