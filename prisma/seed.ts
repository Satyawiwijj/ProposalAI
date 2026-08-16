import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const mockTemplates = [
  {
    key: "tmpl-1",
    name: "Website Redesign",
    category: "consulting",
    description: "Modern, mobile-first website with CMS, SEO, and CRM integration",
    scope: [
      { title: "Discovery & strategy", description: "Stakeholder interviews, content audit, and site architecture", confidence: "high" },
      { title: "UI/UX design", description: "Wireframes, high-fidelity mockups, and interactive prototypes", confidence: "high" },
      { title: "WordPress development", description: "Custom theme development with responsive layout", confidence: "high" },
      { title: "SEO optimization", description: "On-page SEO, schema markup, and performance tuning", confidence: "medium" },
      { title: "HubSpot integration", description: "CRM integration, lead capture forms, and marketing automation", confidence: "medium" },
      { title: "Testing & launch", description: "Cross-browser testing, QA, and production deployment", confidence: "medium" },
    ],
    pricing: { baseRate: 150, complexityMultiplier: 1.35, estimatedRange: [5000, 15000] },
    usageCount: 47,
    tags: ["Web Design", "WordPress", "SEO"],
  },
  {
    key: "tmpl-2",
    name: "Mobile App Development",
    category: "software",
    description: "Cross-platform mobile app with backend, push notifications, and store deployment",
    scope: [
      { title: "Product discovery", description: "Feature prioritization workshops and user flow mapping", confidence: "high" },
      { title: "UI/UX design", description: "Mobile-first design system and screen designs", confidence: "high" },
      { title: "React Native development", description: "Cross-platform iOS/Android development", confidence: "high" },
      { title: "Firebase backend", description: "Auth, database, storage, and cloud functions", confidence: "high" },
      { title: "Push notifications", description: "Notification infrastructure and targeting rules", confidence: "medium" },
      { title: "App Store / Play Store deployment", description: "Store listing, screenshots, and review submission", confidence: "medium" },
      { title: "Post-launch support", description: "30 days of bug fixes and monitoring after launch", confidence: "medium" },
    ],
    pricing: { baseRate: 150, complexityMultiplier: 1.75, estimatedRange: [15000, 50000] },
    usageCount: 12,
    tags: ["React Native", "Firebase", "Mobile"],
  },
  {
    key: "tmpl-3",
    name: "SEO Audit & Strategy",
    category: "marketing",
    description: "Comprehensive technical SEO audit with keyword research and content roadmap",
    scope: [
      { title: "Technical SEO audit", description: "Crawl analysis, indexation review, and technical issue detection", confidence: "high" },
      { title: "Keyword research & mapping", description: "Keyword clustering and content gap analysis", confidence: "high" },
      { title: "Competitor analysis", description: "Benchmark against top competitors in your market", confidence: "medium" },
      { title: "Content strategy", description: "Editorial calendar and content optimization plan", confidence: "medium" },
      { title: "3-month implementation plan", description: "Prioritized roadmap with quick wins first", confidence: "medium" },
      { title: "Monthly reporting", description: "Traffic, rankings, and conversion dashboards", confidence: "medium" },
    ],
    pricing: { baseRate: 150, complexityMultiplier: 1.0, estimatedRange: [2000, 5000] },
    usageCount: 89,
    tags: ["SEO", "Content Strategy", "Audit"],
  },
  {
    key: "tmpl-4",
    name: "E-commerce Platform Build",
    category: "software",
    description: "Custom e-commerce platform with payment integration, inventory, and analytics",
    scope: [
      { title: "Platform architecture", description: "Technical stack selection and system design", confidence: "high" },
      { title: "Product catalog & categories", description: "Product data model, variants, and category tree", confidence: "high" },
      { title: "Shopping cart & checkout", description: "Cart UX and multi-step checkout flow", confidence: "high" },
      { title: "Payment gateway integration", description: "Stripe/PayPal integration with PCI compliance", confidence: "high" },
      { title: "Inventory management", description: "Stock tracking and low-stock alerts", confidence: "medium" },
      { title: "Order management", description: "Admin dashboard for orders, refunds, and fulfillment", confidence: "medium" },
      { title: "Analytics dashboard", description: "Sales, conversion, and traffic analytics", confidence: "medium" },
    ],
    pricing: { baseRate: 150, complexityMultiplier: 2.25, estimatedRange: [20000, 60000] },
    usageCount: 8,
    tags: ["E-commerce", "Payments", "Custom"],
  },
  {
    key: "tmpl-5",
    name: "Brand Identity Package",
    category: "design",
    description: "Complete brand identity with logo, guidelines, and marketing collateral",
    scope: [
      { title: "Brand strategy workshop", description: "Positioning, voice, and visual direction sessions", confidence: "high" },
      { title: "Logo design & variations", description: "Primary logo plus mark, submark, and lockups", confidence: "high" },
      { title: "Color palette & typography", description: "Brand colors and type system with usage rules", confidence: "high" },
      { title: "Brand guidelines document", description: "Comprehensive brand book for internal use", confidence: "medium" },
      { title: "Business card design", description: "Print-ready business card artwork", confidence: "medium" },
      { title: "Letterhead & envelope", description: "Stationery design in print-ready format", confidence: "medium" },
      { title: "Social media templates", description: "Reusable templates for all major platforms", confidence: "medium" },
    ],
    pricing: { baseRate: 150, complexityMultiplier: 1.0, estimatedRange: [3000, 10000] },
    usageCount: 34,
    tags: ["Branding", "Logo", "Guidelines"],
  },
  {
    key: "tmpl-6",
    name: "API Integration Project",
    category: "software",
    description: "Third-party API integration with authentication, error handling, and monitoring",
    scope: [
      { title: "API discovery & documentation review", description: "Deep review of third-party API docs and capabilities", confidence: "high" },
      { title: "Authentication setup (OAuth/API keys)", description: "Secure credential management and token refresh", confidence: "high" },
      { title: "Endpoints implementation", description: "Core integration endpoints with data mapping", confidence: "high" },
      { title: "Error handling & retry logic", description: "Robust error handling, retries, and backoff", confidence: "medium" },
      { title: "Rate limiting & caching", description: "Respect API limits with response caching", confidence: "medium" },
      { title: "Monitoring & alerting", description: "Logging, metrics, and failure alerts", confidence: "medium" },
      { title: "Documentation", description: "Integration docs for your team", confidence: "medium" },
    ],
    pricing: { baseRate: 150, complexityMultiplier: 1.35, estimatedRange: [5000, 20000] },
    usageCount: 15,
    tags: ["API", "Integration", "Backend"],
  },
];

const mockProposals = [
  {
    title: "Website Redesign for Acme Consulting",
    status: "SENT" as const,
    timeline: "4-6 weeks",
    pricing: 6500,
    pricingBreakdown: { baseRate: 150, hoursEstimated: 32, complexityMultiplier: 1.35, total: 6500 },
    terms: "50% deposit on sign, 50% on delivery. Up to 3 rounds of revisions included.",
    sentAt: new Date("2025-01-15T11:00:00Z"),
    scope: [
      { title: "Modern, mobile-first design", description: "Responsive website design across all device sizes", confidence: "high" },
      { title: "WordPress CMS setup", description: "WordPress installation, theme setup, and training", confidence: "high" },
      { title: "HubSpot CRM integration", description: "Contact forms wired to HubSpot with lead tracking", confidence: "high" },
      { title: "SEO optimization", description: "On-page SEO, meta tags, and performance optimization", confidence: "medium" },
    ],
    client: { name: "John Smith", email: "john@acme.com", company: "Acme Consulting" },
    log: [
      { action: "created", createdAt: new Date("2025-01-15T10:30:00Z") },
      { action: "sent", createdAt: new Date("2025-01-15T11:00:00Z") },
    ],
  },
  {
    title: "Mobile App Development for StartupXYZ",
    status: "VIEWED" as const,
    timeline: "8-12 weeks",
    pricing: 28000,
    pricingBreakdown: { baseRate: 150, hoursEstimated: 107, complexityMultiplier: 1.75, total: 28000 },
    terms: "30% deposit, 40% on milestone 2, 30% on delivery. Source code owned by client.",
    sentAt: new Date("2025-01-10T09:00:00Z"),
    scope: [
      { title: "React Native iOS/Android app", description: "Cross-platform app development with React Native", confidence: "high" },
      { title: "Firebase backend", description: "Authentication, database, and cloud functions", confidence: "high" },
      { title: "Push notifications", description: "Push notification infrastructure and targeting", confidence: "medium" },
      { title: "App Store deployment", description: "Store submission and review management", confidence: "medium" },
    ],
    client: { name: "Sarah Chen", email: "sarah@startupxyz.io", company: "StartupXYZ" },
    log: [
      { action: "created", createdAt: new Date("2025-01-08T14:00:00Z") },
      { action: "sent", createdAt: new Date("2025-01-10T09:00:00Z") },
      { action: "viewed", createdAt: new Date("2025-01-11T15:30:00Z") },
    ],
  },
  {
    title: "SEO Audit for Local Business",
    status: "ACCEPTED" as const,
    timeline: "3 weeks",
    pricing: 3500,
    pricingBreakdown: { baseRate: 150, hoursEstimated: 23, complexityMultiplier: 1.0, total: 3500 },
    terms: "50% upfront, 50% on report delivery. Report ownership transfers on full payment.",
    sentAt: new Date("2025-01-05T16:00:00Z"),
    acceptedAt: new Date("2025-01-09T10:00:00Z"),
    scope: [
      { title: "Technical SEO audit", description: "Crawl analysis, indexation, and technical health", confidence: "high" },
      { title: "Keyword research", description: "Keyword opportunities and gap analysis", confidence: "high" },
      { title: "Content strategy", description: "Content roadmap aligned with search demand", confidence: "medium" },
      { title: "3-month implementation plan", description: "Prioritized recommendations with timelines", confidence: "medium" },
    ],
    client: { name: "Mike Torres", email: "mike@localbusiness.com", company: "Local Business Co" },
    log: [
      { action: "created", createdAt: new Date("2025-01-04T11:00:00Z") },
      { action: "sent", createdAt: new Date("2025-01-05T16:00:00Z") },
      { action: "viewed", createdAt: new Date("2025-01-07T09:15:00Z") },
      { action: "accepted", createdAt: new Date("2025-01-09T10:00:00Z") },
    ],
  },
  {
    title: "E-commerce Platform Migration",
    status: "DRAFT" as const,
    timeline: "2 months",
    pricing: 15000,
    pricingBreakdown: { baseRate: 150, hoursEstimated: 57, complexityMultiplier: 1.75, total: 15000 },
    terms: "50% deposit on sign, 50% on delivery. Up to 3 rounds of revisions included.",
    scope: [
      { title: "Shopify to custom Next.js", description: "Custom e-commerce build on Next.js", confidence: "high" },
      { title: "Data migration", description: "Products, customers, and order history migration", confidence: "high" },
      { title: "Payment integration", description: "Stripe and PayPal checkout integration", confidence: "high" },
      { title: "Performance optimization", description: "Core Web Vitals and load time optimization", confidence: "medium" },
    ],
    client: { name: "Anna Lee", email: "anna@fashionretail.com", company: "Fashion Retail Co" },
    log: [{ action: "created", createdAt: new Date("2025-01-16T09:00:00Z") }],
  },
];

async function main() {
  console.log("Seeding database...");

  const user = await prisma.user.upsert({
    where: { email: "demo@proposalpilot.dev" },
    update: {},
    create: {
      email: "demo@proposalpilot.dev",
      name: "Demo User",
      settings: {
        create: {
          companyName: "Acme Consulting",
          website: "https://acme.example.com",
          contactEmail: "hello@acme.example.com",
          defaultCurrency: "USD",
          timezone: "UTC",
          hourlyRate: 150,
          complexityMultiplier: 1.35,
          numberingScheme: "PROP-{YEAR}-{SEQ}",
          defaultTimeline: "2 weeks",
          defaultTerms: "50% deposit on sign, 50% on delivery.\nUp to 3 rounds of revisions included.\nPayment due within 14 days of invoice.",
          notifyProposalViewed: true,
          notifyProposalAccepted: true,
        },
      },
    },
  });
  console.log("User:", user.email);

  for (const t of mockTemplates) {
    await prisma.template.upsert({
      where: { id: t.key },
      update: { usageCount: t.usageCount },
      create: {
        id: t.key,
        name: t.name,
        description: t.description,
        category: t.category,
        scopeItems: t.scope,
        pricing: t.pricing,
        usageCount: t.usageCount,
        isPublic: true,
        userId: user.id,
      },
    });
  }
  console.log("Templates:", mockTemplates.length);

  for (const p of mockProposals) {
    const client = await prisma.client.upsert({
      where: { email: p.client.email },
      update: {},
      create: { name: p.client.name, email: p.client.email, company: p.client.company },
    });

    await prisma.proposal.create({
      data: {
        title: p.title,
        status: p.status,
        timeline: p.timeline,
        pricing: p.pricing,
        pricingBreakdown: p.pricingBreakdown,
        terms: p.terms,
        sentAt: p.sentAt,
        acceptedAt: "acceptedAt" in p ? p.acceptedAt : undefined,
        userId: user.id,
        clientId: client.id,
        scopeItems: {
          create: p.scope.map((s, i) => ({ ...s, order: i })),
        },
        activityLogs: {
          create: p.log,
        },
      },
    });
  }
  console.log("Proposals:", mockProposals.length);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
