import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function ViewProposalPage({ params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id },
    include: { client: true, scopeItems: { orderBy: { order: "asc" } } },
  });

  if (!proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">Proposal not found</h1>
          <p className="text-slate-500 text-sm">
            This link may be invalid or expired. Contact the sender for a fresh copy.
          </p>
        </div>
      </div>
    );
  }

  // Enforce share-link expiry: if the most recent LINK export is past its
  // expiresAt, the link is dead regardless of the proposal's existence.
  const linkExport = await prisma.export.findFirst({
    where: { proposalId: proposal.id, format: "LINK" },
    orderBy: { createdAt: "desc" },
  });
  if (linkExport?.expiresAt && linkExport.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">Link expired</h1>
          <p className="text-slate-500 text-sm">
            This proposal link has expired. Ask the sender for a fresh copy.
          </p>
        </div>
      </div>
    );
  }

  // Auto-track the view (idempotent): a SENT proposal becomes VIEWED the
  // first time its link is opened. Public viewers have no session, so the
  // activity log is recorded without a userId.
  if (proposal.status === "SENT" && !proposal.viewedAt) {
    await prisma.$transaction(async (tx) => {
      await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: "VIEWED", viewedAt: new Date() },
      });
      await tx.activityLog.create({
        data: { action: "viewed", proposalId: proposal.id, metadata: { source: "link" } },
      });
    });
  }

  const breakdown = (proposal.pricingBreakdown as {
    baseRate?: number;
    hoursEstimated?: number;
    complexityMultiplier?: number;
    total?: number;
  }) || { baseRate: 150, hoursEstimated: 0, complexityMultiplier: 1.0, total: Number(proposal.pricing) };
  const subtotal = (breakdown.baseRate ?? 150) * (breakdown.hoursEstimated ?? 0) * (breakdown.complexityMultiplier ?? 1.0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-2 bg-teal-600" />
      <div className="max-w-3xl mx-auto p-6 sm:p-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 sm:p-12">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-2">Proposal</p>
            <h1 className="font-display text-3xl font-bold text-slate-900 mb-8">{proposal.title}</h1>

            <div className="mb-10">
              <h2 className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">Prepared for</h2>
              <p className="text-slate-800 font-medium">{proposal.client?.company || proposal.client?.name || "—"}</p>
              {proposal.client?.email && <p className="text-slate-500 text-sm">{proposal.client.email}</p>}
            </div>

            <div className="mb-10">
              <h2 className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-4">Scope of Work</h2>
              <ol className="space-y-4">
                {proposal.scopeItems.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {item.order + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      {item.description && <p className="text-slate-500 text-sm mt-0.5">{item.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mb-10">
              <h2 className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">Timeline</h2>
              <p className="text-slate-800">{proposal.timeline}</p>
            </div>

            <div className="mb-10">
              <h2 className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-4">Investment</h2>
              <div className="bg-slate-50 rounded-xl p-6 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Base rate</span>
                  <span className="font-medium text-slate-800">{formatMoney(breakdown.baseRate ?? 150)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated hours</span>
                  <span className="font-medium text-slate-800">{breakdown.hoursEstimated ?? 0} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Complexity</span>
                  <span className="font-medium text-slate-800">{breakdown.complexityMultiplier ?? 1.0}x</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-800">{formatMoney(subtotal)}</span>
                </div>
              </div>
              <div className="mt-4 bg-teal-600 rounded-xl p-6 flex items-center justify-between">
                <span className="text-white font-medium">Total Investment</span>
                <span className="text-white font-display text-3xl font-bold">{formatMoney(Number(proposal.pricing))}</span>
              </div>
            </div>

            {proposal.terms && (
              <div>
                <h2 className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">Terms & Conditions</h2>
                <p className="text-slate-500 text-sm whitespace-pre-line">{proposal.terms}</p>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 px-8 sm:px-12 py-4 text-center text-xs text-slate-400">
            Generated with ProposalPilot
          </div>
        </div>
      </div>
    </div>
  );
}