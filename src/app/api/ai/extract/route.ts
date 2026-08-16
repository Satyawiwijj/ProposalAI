import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { getDemoUser } from "@/lib/demo-user";

interface ProviderConfig {
  id: "openai" | "nvidia";
  baseURL: string;
  model: string;
  apiKey: string;
  supportsJsonMode: boolean;
}

function getProviderConfig(): ProviderConfig {
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const hasNVIDIAKey = Boolean(process.env.NVIDIA_API_KEY);
  const provider =
    process.env.AI_PROVIDER ||
    (hasNVIDIAKey || !hasOpenAIKey ? "nvidia" : "openai");

  if (provider === "nvidia") {
    return {
      id: "nvidia",
      baseURL: process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1",
      model: process.env.AI_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
      apiKey: process.env.NVIDIA_API_KEY || "",
      supportsJsonMode: false,
    };
  }

  return {
    id: "openai",
    baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.AI_MODEL || "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY || "",
    supportsJsonMode: true,
  };
}

const extractSchema = z.object({
  notes: z.string().min(50).max(50000),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_RE = /^(not specified|not provided|not mentioned|no mention|was not|unknown|optional|n\/a|na|tbd|to be decided|to be determined|to be confirmed|not confirmed|placeholder)$/i;

const proposalSchema = z.object({
  title: z.string(),
  scope: z.array(z.object({
    title: z.string(),
    description: z.string(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
  })),
  timeline: z.string(),
  pricing: z.number(),
  pricingBreakdown: z.object({
    baseRate: z.number(),
    hoursEstimated: z.number(),
    complexityMultiplier: z.number(),
    total: z.number(),
  }),
  terms: z.string().optional(),
  client: z.object({
    name: z.string().optional(),
    email: z.string().optional().transform((v) => (v && EMAIL_RE.test(v) ? v : undefined)),
    company: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { notes } = extractSchema.parse(body);

    const config = getProviderConfig();
    if (!config.apiKey) {
      return NextResponse.json(
        {
          error: `${config.id === "nvidia" ? "NVIDIA" : "OpenAI"} API key not configured`,
          hint: `Add your ${config.id === "nvidia" ? "NVIDIA_API_KEY" : "OPENAI_API_KEY"} to .env.local`,
        },
        { status: 500 }
      );
    }

    // Auto-context: few-shot from the user's own accepted/sent proposals so
    // drafts match their voice, detail level, and pricing habits — without
    // embeddings or extra infrastructure. Never exposed back to the client.
    let historyContext = "";
    let pastCount = 0;
    let matchedClient: { name?: string; company?: string | null; email?: string } | null = null;
    try {
      const user = await getDemoUser();
      const past = await prisma.proposal.findMany({
        where: { userId: user.id, status: { in: ["SENT", "ACCEPTED"] } },
        orderBy: { updatedAt: "desc" },
        take: 3,
        include: { scopeItems: { orderBy: { order: "asc" } }, client: true },
      });
      pastCount = past.length;
      if (past.length > 0) {
        historyContext = past
          .map((p, i) => {
            const b = (p.pricingBreakdown as {
              baseRate?: number;
              hoursEstimated?: number;
              complexityMultiplier?: number;
            }) || {};
            return [
              `<past-${i + 1}>`,
              `Client: ${p.client?.company || p.client?.name || "—"}${p.client?.email ? ` (${p.client.email})` : ""}`,
              `Title: ${p.title}`,
              `Scope: ${p.scopeItems.map((s) => s.title).join("; ")}`,
              `Timeline: ${p.timeline}`,
              `Pricing: $${Number(p.pricing)} (${b.baseRate ?? 150}/hr x ${b.hoursEstimated ?? 0} hrs x ${b.complexityMultiplier ?? 1}x)`,
              p.terms ? `Terms: ${p.terms}` : "",
              `</past-${i + 1}>`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n");
      }
      const allClients = await prisma.client.findMany();
      const notesLower = notes.toLowerCase();
      matchedClient = allClients.find((c) => c.email && notesLower.includes(c.email.toLowerCase())) || null;
    } catch (e) {
      console.error("Auto-context load failed (continuing without):", e);
    }

    const autoContextSection = [
      historyContext
        ? `## Your past proposals (use ONLY to match the user's voice, detail level, and pricing habits — never quote or reveal these to the client)\n${historyContext}`
        : "",
      matchedClient
        ? `## Returning client detected: ${[matchedClient.name, matchedClient.company].filter(Boolean).join(", ") || "—"} <${matchedClient.email}>`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const contextGuidance = historyContext
      ? `- Match the tone, scope-detail level, and terms structure of your past proposals
- Calibrate pricing and terms to the user's history${matchedClient ? " (especially for the returning client)" : ""}`
      : "";

    const systemPrompt = `You are an expert proposal writer for freelancers and agencies. 
Extract structured proposal data from the user's call notes/meeting transcript.

Return ONLY valid JSON matching this schema. Do NOT wrap it in markdown code fences, do NOT add commentary before or after:
{
  "title": "string - concise proposal title",
  "scope": [
    {"title": "string", "description": "string", "confidence": "high|medium|low"}
  ],
  "timeline": "string (e.g., '2 weeks', '1 month')",
  "pricing": number,
  "pricingBreakdown": {
    "baseRate": number,
    "hoursEstimated": number,
    "complexityMultiplier": number,
    "total": number
  },
  "terms": "string (optional)",
  "client": {
    "name": "string (omit if not mentioned)",
    "email": "string (omit if not mentioned; never use placeholder text)",
    "company": "string (omit if not mentioned)"
  }
}

Guidelines:
- Only include fields mentioned in the notes; omit (do not include) any unknown field
- Never output placeholder text like "optional", "unknown", or "not provided"
- Base rate: $150/hr default
- Complexity multipliers: Simple=1.0x, Standard=1.35x, Complex=1.75x, Enterprise=2.25x
- Estimate hours from scope complexity
- Set confidence: high (explicit in notes), medium (implied), low (vague/uncertain)
- If budget mentioned, use it to calibrate pricing
- If timeline mentioned, use it
- Terms: standard 50/50 split if not specified
${contextGuidance}`;

    const systemPromptFinal = autoContextSection
      ? `${systemPrompt}\n\n${autoContextSection}`
      : systemPrompt;

    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

    const thinkingEnabled = process.env.AI_THINKING === "true";

    const completion = await client.chat.completions.create(
      {
        model: config.model,
        messages: [
          { role: "system", content: systemPromptFinal },
          { role: "user", content: notes },
        ],
        temperature: 0.3,
        max_tokens: thinkingEnabled ? 8192 : 2000,
        ...(config.supportsJsonMode ? { response_format: { type: "json_object" as const } } : {}),
        ...(config.id === "nvidia"
          ? {
              chat_template_kwargs: { enable_thinking: thinkingEnabled },
              ...(thinkingEnabled ? { reasoning_budget: 4096 } : {}),
            }
          : {}),
      } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content from AI provider");
    }

    const parsed = JSON.parse(stripCodeFences(content));
    const validated = proposalSchema.parse(parsed);

    // Strip placeholder leakage the model produces despite the prompt
    // (observed live: "Not specified"). Never let it reach the UI.
    const cleanText = (v?: string): string | undefined => {
      if (!v) return undefined;
      const t = v.trim();
      return t && !PLACEHOLDER_RE.test(t) ? t : undefined;
    };
    const cleaned = {
      ...validated,
      title: cleanText(validated.title) ?? "Untitled proposal",
      timeline: cleanText(validated.timeline) ?? "To be agreed",
      terms: validated.terms !== undefined ? cleanText(validated.terms) : undefined,
      scope: validated.scope.map((s) => ({
        title: cleanText(s.title) ?? "Deliverable",
        description: cleanText(s.description) ?? "",
        confidence: s.confidence,
      })),
      client: validated.client
        ? {
            name: cleanText(validated.client.name),
            email: validated.client.email,
            company: cleanText(validated.client.company),
          }
        : undefined,
    };

    // Add metadata
    const result = {
      ...cleaned,
      _meta: {
        generatedAt: new Date().toISOString(),
        model: config.model,
        provider: config.id,
        inputLength: notes.length,
        historyContext: historyContext ? pastCount : 0,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI extraction error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response", retry: true },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "AI extraction failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function stripCodeFences(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}