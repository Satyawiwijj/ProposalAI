import { prisma } from "@/lib/db";

const DEMO_EMAIL = "demo@proposalpilot.dev";

export async function getDemoUser() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo User",
        settings: {
          create: {
            companyName: "Acme Consulting",
            hourlyRate: 150,
            complexityMultiplier: 1.35,
          },
        },
      },
    });
  }
  return user;
}

export const demoEmail = DEMO_EMAIL;