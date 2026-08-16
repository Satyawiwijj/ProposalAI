"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Trash2, Copy, Send, Eye, CheckCircle, XCircle, Loader2, FileText, FileType2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn, formatPrice } from "@/lib/utils";

interface ApiProposal {
  id: string;
  title: string;
  status: string;
  timeline: string;
  pricing: string;
  pricingBreakdown: {
    baseRate?: number;
    hoursEstimated?: number;
    complexityMultiplier?: number;
    total?: number;
  };
  terms: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  scopeItems: {
    id: string;
    title: string;
    description: string;
    confidence: string;
    order: number;
    hours: string | null;
    rate: string | null;
  }[];
  activityLogs: {
    id: string;
    action: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }[];
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

const actionMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  created: { label: "Created", icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" /> },
  edited: { label: "Edited", icon: <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> },
  exported: { label: "Exported", icon: <FileType2 className="w-3.5 h-3.5" aria-hidden="true" /> },
  sent: { label: "Marked as sent", icon: <Send className="w-3.5 h-3.5" aria-hidden="true" /> },
  viewed: { label: "Marked as viewed", icon: <Eye className="w-3.5 h-3.5" aria-hidden="true" /> },
  accepted: { label: "Accepted", icon: <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> },
  rejected: { label: "Rejected", icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> },
};

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProposalDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<ApiProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/proposals/${params.id}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        return data.proposal as ApiProposal;
      })
      .then((p) => p && setProposal(p))
      .catch(() => toast({ type: "error", title: "Failed to load proposal", message: "Please try again" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleEdit = () => router.push(`/create?proposal=${params.id}`);

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/proposals/${params.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      toast({ type: "success", title: "Duplicated", message: "Draft copy created" });
      router.push(`/proposals/${data.proposal.id}`);
    } catch {
      toast({ type: "error", title: "Duplicate failed", message: "Could not duplicate proposal" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this proposal permanently?")) return;
    try {
      const res = await fetch(`/api/proposals/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      toast({ type: "success", title: "Deleted", message: "Proposal removed" });
      router.push("/dashboard");
    } catch {
      toast({ type: "error", title: "Delete failed", message: "Could not delete proposal" });
    }
  };

  const changeStatus = async (next: string) => {
    if (!proposal || next === proposal.status) return;
    setIsSavingStatus(true);
    try {
      const res = await fetch(`/api/proposals/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("failed");
      toast({ type: "success", title: "Status updated", message: `Marked as ${statusLabels[next]}` });
      load();
    } catch {
      toast({ type: "error", title: "Update failed", message: "Could not update status" });
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleExport = async (format: "pdf" | "word" | "link") => {
    try {
      const res = await fetch(`/api/proposals/${params.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      if (format === "link") {
        const data = await res.json();
        setShareLink(data.linkUrl);
        toast({ type: "success", title: "Link ready", message: "Shareable link generated (expires in 30 days)" });
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ||
        `proposal.${format === "word" ? "docx" : "pdf"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ type: "success", title: `${format.toUpperCase()} ready`, message: `${filename} downloaded` });
    } catch (error) {
      toast({ type: "error", title: "Export failed", message: error instanceof Error ? error.message : "Try again" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto" aria-hidden="true" />
          <p className="text-text-muted mt-3 text-sm">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="min-h-screen bg-surface-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Proposal not found</h1>
          <p className="text-text-muted text-sm mb-6">This proposal doesn&apos;t exist or has been deleted.</p>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const breakdown = proposal.pricingBreakdown || {};
  const subtotal = (breakdown.baseRate ?? 0) * (breakdown.hoursEstimated ?? 0) * (breakdown.complexityMultiplier ?? 1);

  return (
    <div className="min-h-screen bg-surface-background">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-sm border-b border-border-default">
        <div className="container px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-background transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-xl font-bold text-text-primary">{proposal.title}</h1>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", statusStyles[proposal.status])}>
                  {statusLabels[proposal.status]}
                </span>
              </div>
              <p className="text-text-muted text-sm">
                Created {formatDate(proposal.createdAt)} {proposal.sentAt ? `• Sent ${formatDate(proposal.sentAt)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-4 h-4" aria-hidden="true" />} onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Copy className="w-4 h-4" aria-hidden="true" />} onClick={handleDuplicate}>
              Duplicate
            </Button>
            <Button variant="tertiary" size="sm" leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container py-6 max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* Client */}
            <section className="bg-surface-card border border-border-default rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-3">Client</h2>
              {proposal.client ? (
                <div>
                  <p className="font-medium text-text-primary">{proposal.client.company || proposal.client.name}</p>
                  {proposal.client.email && <p className="text-text-muted text-sm">{proposal.client.email}</p>}
                </div>
              ) : (
                <p className="text-text-muted text-sm">No client attached yet.</p>
              )}
            </section>

            {/* Scope */}
            <section className="bg-surface-card border border-border-default rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-4">Scope of Work</h2>
              <ol className="space-y-4">
                {proposal.scopeItems.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                      {item.order + 1}
                    </span>
                    <div>
                      <p className="font-medium text-text-primary">{item.title}</p>
                      {item.description && <p className="text-text-muted text-sm mt-0.5">{item.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Timeline */}
            <section className="bg-surface-card border border-border-default rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-2">Timeline</h2>
              <p className="text-text-primary">{proposal.timeline || "Not specified"}</p>
            </section>

            {/* Investment */}
            <section className="bg-surface-card border border-border-default rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-4">Investment</h2>
              <div className="bg-surface-background rounded-xl p-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Base rate</span>
                  <span className="font-medium text-text-primary">{formatPrice(breakdown.baseRate ?? 150)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Estimated hours</span>
                  <span className="font-medium text-text-primary">{breakdown.hoursEstimated ?? 0} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Complexity</span>
                  <span className="font-medium text-text-primary">{breakdown.complexityMultiplier ?? 1}x</span>
                </div>
                <div className="flex justify-between border-t border-border-default pt-3">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
                </div>
              </div>
              <div className="mt-4 bg-brand-primary rounded-xl p-5 flex items-center justify-between">
                <span className="text-white font-medium">Total Investment</span>
                <span className="text-white font-display text-2xl font-bold">{formatPrice(Number(proposal.pricing))}</span>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" leftIcon={<FileText className="w-4 h-4" aria-hidden="true" />} onClick={() => handleExport("pdf")}>
                  PDF
                </Button>
                <Button size="sm" variant="secondary" leftIcon={<FileType2 className="w-4 h-4" aria-hidden="true" />} onClick={() => handleExport("word")}>
                  Word
                </Button>
                <Button size="sm" variant="secondary" leftIcon={<Link2 className="w-4 h-4" aria-hidden="true" />} onClick={() => handleExport("link")}>
                  Share Link
                </Button>
              </div>
              {shareLink && (
                <div className="mt-3 flex items-center gap-2 bg-surface-background rounded-lg p-3">
                  <a href={shareLink} target="_blank" rel="noreferrer" className="text-sm text-brand-primary truncate hover:underline flex items-center gap-1 flex-1 min-w-0">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{shareLink}</span>
                  </a>
                  <Button size="sm" variant="tertiary" onClick={() => { void navigator.clipboard.writeText(shareLink); toast({ type: "success", title: "Copied", message: "Link copied to clipboard" }); }}>
                    Copy
                  </Button>
                </div>
              )}
            </section>

            {/* Terms */}
            {proposal.terms && (
              <section className="bg-surface-card border border-border-default rounded-xl p-6">
                <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-2">Terms &amp; Conditions</h2>
                <p className="text-text-secondary text-sm whitespace-pre-line">{proposal.terms}</p>
              </section>
            )}

            {/* Activity */}
            <section className="bg-surface-card border border-border-default rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-4">Activity</h2>
              {proposal.activityLogs.length > 0 ? (
                <ol className="space-y-3">
                  {proposal.activityLogs.map((log) => {
                    const meta = actionMeta[log.action] || { label: log.action, icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" /> };
                    return (
                      <li key={log.id} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-background border border-border-default text-text-muted flex items-center justify-center mt-0.5">
                          {meta.icon}
                        </span>
                        <div>
                          <p className="text-sm text-text-primary capitalize">{meta.label}</p>
                          <p className="text-xs text-text-muted">{formatTime(log.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-text-muted text-sm">No activity recorded.</p>
              )}
            </section>
          </div>

          {/* Sidebar: status actions */}
          <aside className="space-y-6">
            <div className="bg-surface-card border border-border-default rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-primary uppercase tracking-wider mb-4">Proposal Status</h2>
              <div className="grid grid-cols-2 gap-2">
                {(["SENT", "VIEWED", "ACCEPTED", "REJECTED"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={proposal.status === status ? "primary" : "secondary"}
                    disabled={isSavingStatus || proposal.status === status}
                    onClick={() => changeStatus(status)}
                  >
                    {proposal.status === status ? `${statusLabels[status]} ✓` : statusLabels[status]}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-text-muted">
                <p>{proposal.sentAt ? `Sent: ${formatDate(proposal.sentAt)}` : "Not sent yet"}</p>
                <p>{proposal.viewedAt ? `Viewed: ${formatDate(proposal.viewedAt)}` : ""}</p>
                <p>{proposal.acceptedAt ? `Accepted: ${formatDate(proposal.acceptedAt)}` : ""}</p>
                <p>{proposal.rejectedAt ? `Rejected: ${formatDate(proposal.rejectedAt)}` : ""}</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}