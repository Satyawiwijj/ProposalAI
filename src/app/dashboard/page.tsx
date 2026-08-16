"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProposalCard, EmptyState, LoadingState } from "@/components/proposal/ProposalCard";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Proposal {
  id: string;
  title: string;
  scope: string[];
  pricing: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected";
  sentAt?: string;
  createdAt: string;
}

interface ApiProposal {
  id: string;
  title: string;
  status: string;
  pricing: string;
  timeline: string;
  sentAt: string | null;
  createdAt: string;
  client?: { name: string; email: string; company: string | null } | null;
  scopeItems: { id: string; title: string; description: string; confidence: string }[];
}

function mapProposal(p: ApiProposal): Proposal {
  return {
    id: p.id,
    title: p.title,
    scope: p.scopeItems.map((s) => s.title),
    pricing: Number(p.pricing),
    status: p.status.toLowerCase() as Proposal["status"],
    sentAt: p.sentAt ?? undefined,
    createdAt: p.createdAt,
  };
}

async function fetchProposals(): Promise<Proposal[]> {
  const res = await fetch("/api/proposals", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load proposals");
  const data = await res.json();
  return (data.proposals as ApiProposal[]).map(mapProposal);
}

export default function Dashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [funnel, setFunnel] = useState<{ drafts: number; sent: number; viewed: number; won: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProposals()
      .then(setProposals)
      .catch((err) => toast({ type: "error", title: "Failed to load proposals", message: err.message }))
      .finally(() => setIsLoading(false));
    fetch("/api/analytics", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setFunnel(data.funnel))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scope.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProposal = () => {
    router.push("/create");
  };

  const handleEdit = (id: string) => {
    router.push(`/proposals/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/proposals/${id}`);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/proposals/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Duplicate failed");
      const data = await res.json();
      setProposals((prev) => [mapProposal(data.proposal), ...prev]);
      toast({ type: "success", title: "Duplicated", message: "Created a draft copy" });
    } catch {
      toast({ type: "error", title: "Duplicate failed", message: "Could not duplicate proposal" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this proposal?")) return;
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setProposals((prev) => prev.filter((p) => p.id !== id));
      toast({ type: "success", title: "Deleted", message: "Proposal removed" });
    } catch {
      toast({ type: "error", title: "Delete failed", message: "Could not delete proposal" });
    }
  };

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "viewed", label: "Viewed" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-surface-background">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface-card border-r border-border-default transform transition-transform duration-200 ease-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border-default">
            <h1 className="font-display text-xl font-bold text-text-primary">
              ProposalPilot
            </h1>
            <p className="text-xs text-text-muted mt-1">Turn notes into proposals</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-background font-medium transition-colors"
              aria-current="page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
            <a
              href="/create"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-background font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Proposal
            </a>
            <a
              href="/templates"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-background font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Templates
            </a>
          </nav>

          {/* Settings */}
          <div className="p-4 border-t border-border-default">
            <a
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-background font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface-card border border-border-default shadow-lg"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open menu"
        aria-expanded={isSidebarOpen}
      >
        <Menu className="w-6 h-6 text-text-primary" aria-hidden="true" />
      </button>

      {/* Main content */}
      <main id="main-content" className="lg:ml-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-sm border-b border-border-default">
          <div className="container px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-2xl font-bold text-text-primary">Dashboard</h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">
                {proposals.filter((p) => p.status !== "draft").length} active
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search proposals"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 text-sm border border-border-default rounded-lg bg-surface-card focus-visible:ring-2 focus-visible:ring-brand-primary"
                aria-label="Filter by status"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="container py-6">
          {/* Funnel stats */}
          {funnel && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" aria-label="Proposal funnel stats">
              {[
                { label: "Drafts", value: funnel.drafts, hint: "in progress" },
                { label: "Sent", value: funnel.sent, hint: funnel.sent > 0 ? `${Math.round((funnel.sent / Math.max(funnel.sent + funnel.drafts, 1)) * 100)}% of total` : "none yet" },
                { label: "Viewed", value: funnel.viewed, hint: funnel.sent > 0 ? `${Math.round((funnel.viewed / funnel.sent) * 100)}% of sent` : "no sent links yet" },
                { label: "Won", value: funnel.won, hint: funnel.viewed > 0 ? `${Math.round((funnel.won / funnel.viewed) * 100)}% of viewed` : "no views yet" },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-card border border-border-default rounded-xl p-4">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{stat.label}</p>
                  <p className="font-display text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
                  <p className="text-xs text-text-muted mt-0.5">{stat.hint}</p>
                </div>
              ))}
            </div>
          )}

          {/* Create button + title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-xl font-semibold text-text-primary">Your Proposals</h3>
              <p className="text-text-muted text-sm mt-0.5">
                {proposals.length} total • {proposals.filter((p) => p.status === "draft").length} drafts • {proposals.filter((p) => p.status === "accepted").length} won
              </p>
            </div>
            <Button onClick={handleCreateProposal} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
              Create Proposal
            </Button>
          </div>

          {/* Proposals grid */}
          {isLoading ? (
            <LoadingState variant="list" message="Loading proposals..." />
          ) : filteredProposals.length > 0 ? (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              }}
              role="list"
              aria-label="Proposals"
            >
              {filteredProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  id={proposal.id}
                  title={proposal.title}
                  scope={proposal.scope}
                  pricing={proposal.pricing}
                  status={proposal.status}
                  sentAt={proposal.sentAt}
                  onEdit={() => handleEdit(proposal.id)}
                  onView={() => handleView(proposal.id)}
                  onDuplicate={() => handleDuplicate(proposal.id)}
                  onDelete={() => handleDelete(proposal.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No proposals found"
              description={searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't created any proposals yet. Click the button above to create your first one."}
              action={{
                label: searchQuery || statusFilter !== "all" ? "Clear filters" : "Create your first proposal",
                onClick: () => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  if (!searchQuery && statusFilter === "all") handleCreateProposal();
                },
                variant: searchQuery || statusFilter !== "all" ? "secondary" : "primary",
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}