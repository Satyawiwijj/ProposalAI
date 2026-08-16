import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

const sendSchema = z.object({
  to: z.string().email(),
  format: z.enum(["link", "pdf", "word"]).default("link"),
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c];
  });
}

export const dynamic = "force-dynamic";

export async function POST(
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
    const data = sendSchema.parse(body as object);
    const user = await getDemoUser();

    const proposal = await prisma.proposal.findFirst({
      where: { id: params.id, userId: user.id },
      include: { client: true },
    });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });

    // Always generate a share link so the recipient can open the proposal.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3111";
    const linkUrl = `${baseUrl}/view/${params.id}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.export.create({
      data: { format: "LINK", proposalId: params.id, fileUrl: linkUrl, expiresAt },
    });

    const apiKey = settings?.emailApiKey || process.env.RESEND_API_KEY;
    const fromEmail = settings?.emailFromAddress || process.env.RESEND_FROM || "onboarding@resend.dev";
    const fromName = settings?.emailFromName || "ProposalPilot";
    const clientName = proposal.client?.company || proposal.client?.name || data.to;
    const recipient = data.to;
    const prevStatus = proposal.status;

    if (!apiKey) {
      // Graceful not-configured fallback: mark sent, log, return the link.
      await prisma.proposal.update({
        where: { id: params.id },
        data: { status: "SENT", sentAt: proposal.sentAt || new Date() },
      });
      if (prevStatus !== "SENT") {
        await prisma.activityLog.create({
          data: { action: "sent", proposalId: params.id, userId: user.id, metadata: { via: "email", configured: false, to: recipient } },
        });
      }
      return NextResponse.json({
        sent: false,
        configured: false,
        message: "Email not configured. Share the link below.",
        linkUrl,
        expiresAt: expiresAt.toISOString(),
      });
    }

    const subject = `Proposal for ${clientName}: ${proposal.title}`;
    const text = `Hi ${clientName},\n\nHere is your proposal: "${proposal.title}".\n\nOpen it here: ${linkUrl}\n\nThis link expires in 30 days.\n\nBest,\n${fromName}`;
    const safeClient = escapeHtml(clientName);
    const safeTitle = escapeHtml(proposal.title);
    const safeLink = escapeHtml(linkUrl);
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0D9488">Proposal for ${safeClient}</h2>
        <p>Hi ${safeClient},</p>
        <p>Here is your proposal: <strong>${safeTitle}</strong>.</p>
        <p><a href="${safeLink}" style="background:#0D9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">View Proposal</a></p>
        <p style="color:#888;font-size:12px">This link expires in 30 days.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#888;font-size:12px">Sent via ${fromName}</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipient],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Resend error");
      throw new Error(`Email provider error: ${errText}`);
    }

    await prisma.proposal.update({
      where: { id: params.id },
      data: { status: "SENT", sentAt: proposal.sentAt || new Date() },
    });
    if (prevStatus !== "SENT") {
      await prisma.activityLog.create({
        data: { action: "sent", proposalId: params.id, userId: user.id, metadata: { via: "email", configured: true, to: recipient } },
      });
    }

    return NextResponse.json({ sent: true, configured: true, to: recipient, linkUrl, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("Send proposal error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to send email", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}