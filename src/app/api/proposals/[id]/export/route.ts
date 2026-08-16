import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

const exportSchema = z.object({
  format: z.enum(["pdf", "word", "link"]),
});

const BRAND = {
  teal: [0.05, 0.58, 0.53] as [number, number, number],
  ink: [0.12, 0.16, 0.23] as [number, number, number],
  muted: [0.39, 0.45, 0.53] as [number, number, number],
  white: [1, 1, 1] as [number, number, number],
};

const BRAND_HEX = {
  teal: "#0D9488",
  ink: "#1E293B",
  muted: "#64748B",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapLines(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPdf(
  title: string,
  client: { name?: string; company?: string | null; email?: string } | null,
  scope: { title: string; description: string }[],
  timeline: string,
  pricing: number,
  breakdown: { baseRate: number; hoursEstimated: number; complexityMultiplier: number; total: number },
  terms: string | null
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawLine = (text: string, font: any, size: number, color: [number, number, number], indent = 0) => {
    page.drawText(text, { x: MARGIN + indent, y, size, font, color: rgb(...color) });
    y -= size * 1.35;
  };

  const drawWrapped = (text: string, size: number, color: [number, number, number], indent = 0) => {
    for (const line of wrapLines(text, regular, size, CONTENT_WIDTH - indent)) {
      drawLine(line, regular, size, color, indent);
    }
    y -= 4;
  };

  // Header band
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: rgb(...BRAND.teal) });
  y -= 8;
  y -= 40;
  page.drawText("PROPOSAL", { x: MARGIN, y, size: 22, font: bold, color: rgb(...BRAND.ink) });
  y -= 30;
  drawWrapped(title, 11, BRAND.muted);

  y -= 24;
  page.drawText("Prepared for", { x: MARGIN, y, size: 14, font: bold, color: rgb(...BRAND.teal) });
  y -= 20;
  page.drawText(client?.company || client?.name || "—", { x: MARGIN, y, size: 11, font: regular, color: rgb(...BRAND.ink) });
  y -= 15;
  if (client?.email) {
    page.drawText(client.email, { x: MARGIN, y, size: 10, font: regular, color: rgb(...BRAND.muted) });
    y -= 15;
  }

  // Scope of work
  y -= 24;
  page.drawText("Scope of Work", { x: MARGIN, y, size: 14, font: bold, color: rgb(...BRAND.teal) });
  y -= 22;
  scope.forEach((item, i) => {
    drawWrapped(`${i + 1}. ${item.title}`, 11, BRAND.ink);
    if (item.description) {
      drawWrapped(item.description, 10, BRAND.muted, 14);
    }
    y -= 6;
  });

  // Overflow handling: when the current page is full, rotate to a fresh page
  // by mutating `page` so every subsequent draw lands on the active page.
  const ensureSpace = (needed: number) => {
    if (y < MARGIN + needed) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    return page;
  };

  // Timeline
  ensureSpace(70);
  y -= 20;
  page.drawText("Timeline", { x: MARGIN, y, size: 14, font: bold, color: rgb(...BRAND.teal) });
  y -= 20;
  drawWrapped(timeline || "To be agreed", 11, BRAND.ink);

  // Investment
  ensureSpace(220);
  y -= 24;
  page.drawText("Investment", { x: MARGIN, y, size: 14, font: bold, color: rgb(...BRAND.teal) });
  y -= 20;
  const rows: [string, string][] = [
    ["Base rate", `${formatMoney(breakdown.baseRate)}/hr`],
    ["Estimated hours", `${breakdown.hoursEstimated} hrs`],
    ["Complexity multiplier", `${breakdown.complexityMultiplier}x`],
    ["Subtotal", formatMoney(breakdown.baseRate * breakdown.hoursEstimated * breakdown.complexityMultiplier)],
  ];
  rows.forEach(([label, value]) => {
    page.drawText(label, { x: MARGIN, y, size: 11, font: regular, color: rgb(...BRAND.muted) });
    page.drawText(value, { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(value, 11), y, size: 11, font: regular, color: rgb(...BRAND.ink) });
    y -= 20;
  });

  // Total band
  y -= 14;
  page.drawRectangle({ x: MARGIN, y, width: CONTENT_WIDTH, height: 44, color: rgb(...BRAND.teal) });
  page.drawText("Total", { x: MARGIN + 12, y: y + 14, size: 12, font: bold, color: rgb(...BRAND.white) });
  const totalStr = formatMoney(pricing);
  page.drawText(totalStr, {
    x: PAGE_WIDTH - MARGIN - 12 - bold.widthOfTextAtSize(totalStr, 16),
    y: y + 9,
    size: 16,
    font: bold,
    color: rgb(...BRAND.white),
  });
  y -= 44;

  // Terms
  if (terms) {
    ensureSpace(120);
    y -= 24;
    page.drawText("Terms & Conditions", { x: MARGIN, y, size: 14, font: bold, color: rgb(...BRAND.teal) });
    y -= 20;
    drawWrapped(terms, 10, BRAND.muted);
  }

  // Footer on all pages
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `ProposalPilot — ${title} — Page ${i + 1} of ${pages.length}`,
      {
        x: MARGIN,
        y: 30,
        size: 9,
        font: regular,
        color: rgb(...BRAND.muted),
        maxWidth: CONTENT_WIDTH,
        lineHeight: 12,
      }
    );
  });

  return pdf.save();
}

function buildWord(
  title: string,
  client: { name?: string; company?: string | null; email?: string } | null,
  scope: { title: string; description: string }[],
  timeline: string,
  pricing: number,
  breakdown: { baseRate: number; hoursEstimated: number; complexityMultiplier: number; total: number },
  terms: string | null
) {
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, color: BRAND_HEX.ink })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Prepared for", color: BRAND_HEX.teal })],
    }),
    new Paragraph({
      children: [new TextRun({ text: client?.company || client?.name || "—", bold: true })],
    }),
    ...(client?.email
      ? [new Paragraph({ children: [new TextRun({ text: client.email, color: BRAND_HEX.muted })] })]
      : []),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Scope of Work", color: BRAND_HEX.teal })],
    }),
    ...scope.map(
      (item) =>
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: item.title, bold: true }),
            ...(item.description
              ? [new TextRun({ text: ` — ${item.description}`, color: BRAND_HEX.muted })]
              : []),
          ],
        })
    ),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Timeline", color: BRAND_HEX.teal })],
    }),
    new Paragraph({ children: [new TextRun({ text: timeline || "To be agreed" })] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Investment", color: BRAND_HEX.teal })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Base rate: `, color: BRAND_HEX.muted }),
        new TextRun({ text: `${formatMoney(breakdown.baseRate)}/hr` }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Estimated hours: `, color: BRAND_HEX.muted }),
        new TextRun({ text: `${breakdown.hoursEstimated} hrs` }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Complexity multiplier: `, color: BRAND_HEX.muted }),
        new TextRun({ text: `${breakdown.complexityMultiplier}x` }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Subtotal: `, color: BRAND_HEX.muted }),
        new TextRun({ text: formatMoney(breakdown.baseRate * breakdown.hoursEstimated * breakdown.complexityMultiplier) }),
      ],
    }),
    new Paragraph({
      spacing: { before: 240, after: 120 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: formatMoney(pricing),
          bold: true,
          size: 40,
          color: BRAND_HEX.teal,
        }),
      ],
    }),
    ...(terms
      ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Terms & Conditions", color: BRAND_HEX.teal })],
          }),
          new Paragraph({ children: [new TextRun({ text: terms, color: BRAND_HEX.muted })] }),
        ]
      : []),
  ];

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "proposal";
}

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
    const { format } = exportSchema.parse(body as object);
    const user = await getDemoUser();

    const proposal = await prisma.proposal.findFirst({
      where: { id: params.id, userId: user.id },
      include: { client: true, scopeItems: { orderBy: { order: "asc" } } },
    });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const breakdown = (proposal.pricingBreakdown as {
      baseRate?: number;
      hoursEstimated?: number;
      complexityMultiplier?: number;
      total?: number;
    }) || { baseRate: 150, hoursEstimated: 0, complexityMultiplier: 1.0, total: Number(proposal.pricing) };

    const scope = proposal.scopeItems.map((s) => ({ title: s.title, description: s.description }));
    const baseRate = breakdown.baseRate ?? 150;
    const hours = breakdown.hoursEstimated ?? 0;
    const multiplier = breakdown.complexityMultiplier ?? 1.0;
    const total = Number(proposal.pricing);

    const fileName = `${slugify(proposal.title)}.${format === "word" ? "docx" : "pdf"}`;

    let fileUrl: string | null = null;
    let expiresAt: Date | null = null;

    if (format === "pdf") {
      const bytes = await buildPdf(
        proposal.title,
        proposal.client,
        scope,
        proposal.timeline,
        total,
        { baseRate, hoursEstimated: hours, complexityMultiplier: multiplier, total },
        proposal.terms
      );
      await prisma.export.create({
        data: { format: "PDF", proposalId: proposal.id, fileName },
      });
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "X-Proposal-Id": proposal.id,
        },
      });
    }

    if (format === "word") {
      const doc = buildWord(
        proposal.title,
        proposal.client,
        scope,
        proposal.timeline,
        total,
        { baseRate, hoursEstimated: hours, complexityMultiplier: multiplier, total },
        proposal.terms
      );
      const buffer = await Packer.toBuffer(doc);
      await prisma.export.create({
        data: { format: "WORD", proposalId: proposal.id, fileName },
      });
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "X-Proposal-Id": proposal.id,
        },
      });
    }

    // LINK format
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.export.create({
      data: { format: "LINK", proposalId: proposal.id, expiresAt },
    });
    await prisma.activityLog.create({
      data: { action: "exported", proposalId: proposal.id, userId: user.id },
    });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3111";
    return NextResponse.json({ linkUrl: `${baseUrl}/view/${proposal.id}`, expiresAt });
  } catch (error) {
    console.error("Export error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}