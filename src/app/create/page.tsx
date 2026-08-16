"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, AlertTriangle, Trash2, Plus, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn, formatPrice, generateId } from "@/lib/utils";

interface ScopeItem {
  id: string;
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface ProposalDraft {
  title: string;
  scope: ScopeItem[];
  timeline: string;
  pricing: number;
  pricingBreakdown: {
    baseRate: number;
    hoursEstimated: number;
    complexityMultiplier: number;
    total: number;
  };
  terms: string;
  client: {
    name: string;
    email: string;
    company: string;
  };
}

const timelineOptions = [
  "1 week",
  "2 weeks",
  "3 weeks",
  "1 month",
  "2 months",
  "Custom",
];

const confidenceStyles = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
};

const confidenceLabels = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — review carefully",
};

export default function CreateProposalPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "word" | "link">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  const charCount = notes.length;

  // Prefill: /create?template=id or /create?proposal=id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get("template");
    const proposalIdParam = params.get("proposal");
    if (!templateId && !proposalIdParam) return;

    if (proposalIdParam) {
      fetch(`/api/proposals/${proposalIdParam}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const p = data.proposal;
          const breakdown = p.pricingBreakdown || {};
          const newDraft: ProposalDraft = {
            title: p.title,
            scope: (p.scopeItems || []).map((s: any) => ({
              id: s.id || generateId(),
              title: s.title,
              description: s.description || "",
              confidence: s.confidence || "medium",
            })),
            timeline: p.timeline || "",
            pricing: Number(p.pricing) || 0,
            pricingBreakdown: {
              baseRate: breakdown.baseRate || 150,
              hoursEstimated: breakdown.hoursEstimated || 0,
              complexityMultiplier: breakdown.complexityMultiplier || 1,
              total: Number(p.pricing) || 0,
            },
            terms: p.terms || "",
            client: {
              name: p.client?.name || "",
              email: p.client?.email || "",
              company: p.client?.company || "",
            },
          };
          setDraft(newDraft);
          setProposalId(p.id);
          setStep(2);
          toast({ type: "info", title: "Proposal loaded", message: "Editing existing proposal" });
        })
        .catch(() => toast({ type: "error", title: "Load failed", message: "Could not load proposal" }));
      return;
    }

    fetch("/api/templates", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const t = (data.templates as any[]).find((x) => String(x.id) === templateId);
        if (!t) return;
        const breakdown = t.pricing || {};
        const newDraft: ProposalDraft = {
          title: t.name,
          scope: (t.scopeItems || []).map((s: any) => ({
            id: generateId(),
            title: s.title,
            description: s.description || "",
            confidence: "medium",
          })),
          timeline: breakdown.defaultTimeline || "2 weeks",
          pricing: breakdown.estimatedRange?.[0] || 5000,
          pricingBreakdown: {
            baseRate: breakdown.baseRate || 150,
            hoursEstimated: breakdown.hoursEstimated || Math.round((breakdown.estimatedRange?.[0] || 5000) / (breakdown.baseRate || 150)),
            complexityMultiplier: breakdown.complexityMultiplier || 1.35,
            total: breakdown.estimatedRange?.[0] || 5000,
          },
          terms: "",
          client: { name: "", email: "", company: "" },
        };
        setDraft(newDraft);
        setStep(2);
        toast({ type: "info", title: "Template loaded", message: `Starting from ${t.name}` });
      })
      .catch(() => toast({ type: "error", title: "Template load failed", message: "Could not load template" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save to DB
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);
  const pendingDraft = useRef<ProposalDraft | null>(null);

  useEffect(() => {
    if (!draft || step === 1) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingDraft.current = draft;
    saveTimer.current = setTimeout(() => {
      void (async () => {
        if (saveInFlight.current) return;
        const toSave = pendingDraft.current;
        if (!toSave) return;
        saveInFlight.current = true;
        try {
          const payload = {
            title: toSave.title || "Untitled proposal",
            timeline: toSave.timeline,
            pricing: toSave.pricing,
            pricingBreakdown: toSave.pricingBreakdown,
            terms: toSave.terms,
            client: toSave.client?.email ? toSave.client : undefined,
            scopeItems: toSave.scope.map((s) => ({
              id: s.id,
              title: s.title || "Untitled deliverable",
              description: s.description,
              confidence: s.confidence,
            })),
          };
          if (proposalIdRef.current) {
            await fetch(`/api/proposals/${proposalIdRef.current}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            const res = await fetch("/api/proposals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              const data = await res.json();
              proposalIdRef.current = data.proposal.id;
              setProposalId(data.proposal.id);
            }
          }
        } catch {
          // silent auto-save failure; user can export which forces a save
        } finally {
          saveInFlight.current = false;
        }
      })();
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, step]);

  // Keep refs in sync for the debounced saver
  const proposalIdRef = useRef<string | null>(null);
  useEffect(() => {
    proposalIdRef.current = proposalId;
    setProposalId(proposalIdRef.current);
  }, [proposalId]);

  const handleAnalyze = async () => {
    if (notes.length < 50) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      const newDraft: ProposalDraft = {
        title: data.title,
        scope: data.scope.map((s: any, i: number) => ({
          id: generateId(),
          title: s.title,
          description: s.description,
          confidence: s.confidence || "medium",
        })),
        timeline: data.timeline,
        pricing: data.pricing,
        pricingBreakdown: data.pricingBreakdown,
        terms: data.terms || "50% deposit on signing, 50% on delivery. Revisions included within scope. Additional work billed at $150/hr.",
        client: data.client || {},
      };

      setDraft(newDraft);
      setStep(2);
      toast({ type: "success", title: "Draft ready!", message: "Review and customize your proposal" });
    } catch (error) {
      toast({ type: "error", title: "Analysis failed", message: error instanceof Error ? error.message : "Try again" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateScopeItem = (id: string, field: "title" | "description", value: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            scope: prev.scope.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
          }
        : null
    );
  };

  const addScopeItem = () => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            scope: [...prev.scope, { id: generateId(), title: "", description: "", confidence: "medium" }],
          }
        : null
    );
  };

  const removeScopeItem = (id: string) => {
    setDraft((prev) =>
      prev ? { ...prev, scope: prev.scope.filter((item) => item.id !== id) } : null
    );
  };

  const startEdit = (id: string, field: "title" | "description", currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const saveEdit = (id: string, field: "title" | "description") => {
    updateScopeItem(id, field, editValue);
    setEditingId(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleExport = async () => {
    if (!draft) return;
    setIsExporting(true);
    setShowExportModal(false);

    try {
      // Force an immediate save first
      let id = proposalIdRef.current;
      if (!id) {
        const payload = {
          title: draft.title || "Untitled proposal",
          timeline: draft.timeline,
          pricing: draft.pricing,
          pricingBreakdown: draft.pricingBreakdown,
          terms: draft.terms,
          client: draft.client?.email ? draft.client : undefined,
          scopeItems: draft.scope.map((s) => ({
            title: s.title || "Untitled deliverable",
            description: s.description,
            confidence: s.confidence,
          })),
        };
        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Could not save proposal");
        const data = await res.json();
        id = data.proposal.id;
        proposalIdRef.current = id;
        setProposalId(id);
      }

      const res = await fetch(`/api/proposals/${id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }

      if (exportFormat === "link") {
        const data = await res.json();
        setShareLink(data.linkUrl);
        toast({ type: "success", title: "Link ready", message: "Shareable link generated (expires in 30 days)" });
        setStep(3);
        return;
      }

      // PDF / Word: trigger download
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ||
        `proposal.${exportFormat === "word" ? "docx" : "pdf"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ type: "success", title: `${exportFormat.toUpperCase()} ready`, message: `${filename} downloaded` });
      setStep(3);
    } catch (error) {
      toast({ type: "error", title: "Export failed", message: error instanceof Error ? error.message : "Try again" });
      setShowExportModal(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSend = async () => {
    const recipient = draft?.client?.email;
    if (!recipient) {
      toast({ type: "error", title: "No client email", message: "Add a client email in the editor before sending" });
      setStep(2);
      return;
    }
    setIsExporting(true);
    try {
      let id = proposalIdRef.current;
      if (!id) {
        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title || "Untitled proposal",
            timeline: draft.timeline,
            pricing: draft.pricing,
            pricingBreakdown: draft.pricingBreakdown,
            terms: draft.terms,
            client: draft.client?.email ? draft.client : undefined,
            scopeItems: draft.scope.map((s) => ({
              title: s.title || "Untitled deliverable",
              description: s.description,
              confidence: s.confidence,
            })),
          }),
        });
        if (!res.ok) throw new Error("Could not save proposal");
        const data = await res.json();
        id = data.proposal.id;
        proposalIdRef.current = id;
        setProposalId(id);
      }

      const res = await fetch(`/api/proposals/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, format: "link" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Send failed");

      if (!data.configured) {
        setShareLink(data.linkUrl);
        setStep(3);
        toast({ type: "info", title: "Email not configured", message: "Connect Resend in Settings → Integrations to send via email" });
      } else {
        setShareLink(data.linkUrl);
        setStep(3);
        toast({ type: "success", title: "Proposal sent", message: `Email sent to ${data.to}` });
      }
    } catch (error) {
      toast({ type: "error", title: "Send failed", message: error instanceof Error ? error.message : "Try again" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-background">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-sm border-b border-border-default">
        <div className="container px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-background transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-text-primary">
                {step === 1 ? "Create Proposal" : step === 2 ? "Review & Edit" : "Export & Send"}
              </h1>
              <p className="text-text-muted text-sm">
                {step === 1 && "Paste call notes → AI creates draft"}
                {step === 2 && "Review scope, pricing, timeline"}
                {step === 3 && "Export PDF/Word or send via email"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress indicator */}
            <div className="hidden sm:flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      step >= s
                        ? "bg-brand-primary text-white"
                        : "bg-slate-200 text-text-muted"
                    )}
                  >
                    {s}
                  </span>
                  {s < 3 && <span className={cn("w-8 h-0.5", step > s ? "bg-brand-primary" : "bg-slate-200")} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="container py-6 max-w-4xl">
        {/* Step 1: Paste Notes */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto animate-slide-in">
            <div className="bg-surface-card border border-border-default rounded-xl p-6 sm:p-8">
              <h2 className="font-display text-lg font-semibold text-text-primary mb-2">Paste call notes or meeting transcript</h2>
              <p className="text-text-muted text-sm mb-6">
                Include budget, timeline, must-haves, and any constraints for best results. Analysis usually takes ~10 seconds.
              </p>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='e.g., "Client needs a new website for their consulting business. They want: modern design, mobile-first, WordPress CMS for blog, contact form with HubSpot integration, SEO optimization. Budget: $5-8k, Timeline: 4-6 weeks."'
                rows={10}
                className="font-mono text-sm"
                aria-describedby="char-count"
              />
              <div className="flex items-center justify-between mt-3">
                <span id="char-count" className="text-sm text-text-muted">
                  {charCount} / 50,000 characters
                </span>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={notes.length < 50 || isAnalyzing}
                  isLoading={isAnalyzing}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.5a3.374 3.374 0 00-3.374-3.374l-.029-.018z" />
                      </svg>
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>

              <p className="mt-4 text-center text-xs text-text-muted">
                Need inspiration? Paste this example:
                <button
                  type="button"
                  onClick={() =>
                    setNotes(
                      'Client: Acme Consulting\nContact: John Smith, john@acme.com\nNeeds: Website redesign for consulting business\n- Modern, mobile-first design\n- WordPress CMS for blog\n- Contact form with HubSpot integration\n- SEO optimization\nBudget: $5-8k\nTimeline: 4-6 weeks'
                    )
                  }
                  className="ml-2 text-brand-primary hover:underline font-medium"
                >
                  Try example
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Review & Edit */}
        {step === 2 && draft && (
          <div className="max-w-4xl mx-auto animate-slide-in">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Main editor */}
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Proposal Title</label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Enter proposal title"
                    className="font-display text-lg"
                  />
                </div>

                {/* Scope Editor */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-text-primary">Scope of Work</h3>
                    <Button variant="tertiary" size="sm" onClick={addScopeItem} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
                      Add Deliverable
                    </Button>
                  </div>

                  <div className="space-y-3" role="list" aria-label="Scope items">
                    {draft.scope.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "bg-surface-card border rounded-lg p-4 transition-colors",
                          editingId === item.id ? "border-brand-primary" : "border-border-default"
                        )}
                        role="listitem"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 text-text-muted mt-1">{index + 1}.</span>

                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Title */}
                            <div>
                              {editingId === item.id ? (
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id, "title")}
                                  onBlur={() => saveEdit(item.id, "title")}
                                  autoFocus
                                  className="font-medium text-lg"
                                />
                              ) : (
                                <h4
                                  className="font-medium text-text-primary cursor-text hover:underline"
                                  onClick={() => startEdit(item.id, "title", item.title)}
                                >
                                  {item.title || <span className="text-text-muted">Untitled deliverable</span>}
                                </h4>
                              )}
                            </div>

                            {/* Description */}
                            <div>
                              {editingId === item.id ? (
                                <Textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveEdit(item.id, "description")}
                                  onBlur={() => saveEdit(item.id, "description")}
                                  autoFocus
                                  rows={2}
                                  placeholder="Add description..."
                                />
                              ) : (
                                <p
                                  className="text-sm text-text-secondary cursor-text hover:underline"
                                  onClick={() => startEdit(item.id, "description", item.description)}
                                >
                                  {item.description || <span className="text-text-muted">Click to add description</span>}
                                </p>
                              )}
                            </div>

                            {/* Confidence badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                  confidenceStyles[item.confidence]
                                )}
                              >
                                {confidenceLabels[item.confidence]}
                              </span>

                              {item.confidence === "low" && (
                                <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" aria-hidden="true" />
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-3 border-t border-border-default">
                            {editingId === item.id ? (
                              <>
                                <Button variant="secondary" size="sm" onClick={() => saveEdit(item.id, "title")}>
                                  Save
                                </Button>
                                <Button variant="tertiary" size="sm" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="tertiary" size="sm" onClick={() => startEdit(item.id, "title", item.title)}>
                                  Edit title
                                </Button>
                                <Button variant="tertiary" size="sm" onClick={() => startEdit(item.id, "description", item.description)}>
                                  Edit description
                                </Button>
                                <Button variant="tertiary" size="sm" onClick={() => removeScopeItem(item.id)} className="text-status-error hover:text-status-error">
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Timeline & Pricing */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Timeline</label>
                      <Select
                        value={draft.timeline}
                        onChange={(e) => setDraft({ ...draft, timeline: e.target.value })}
                        options={timelineOptions.map((t) => ({ value: t, label: t }))}
                        placeholder="Select timeline"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-text-primary">Total Price</label>
                        <button
                          type="button"
                          className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                          onClick={() => toast({ type: "info", title: "Pricing logic", message: `Based on ${draft.pricingBreakdown.hoursEstimated} hrs × $${draft.pricingBreakdown.baseRate}/hr × ${draft.pricingBreakdown.complexityMultiplier}x complexity = $${formatPrice(draft.pricingBreakdown.total)}` })}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          See breakdown
                        </button>
                      </div>
                      <Input
                        type="number"
                        value={draft.pricing}
                        onChange={(e) => setDraft({ ...draft, pricing: parseInt(e.target.value) || 0 })}
                        className="font-display text-3xl font-bold text-brand-primary text-center"
                        inputMode="numeric"
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Client Name"
                      value={draft.client.name}
                      onChange={(e) => setDraft({ ...draft, client: { ...draft.client, name: e.target.value } })}
                      placeholder="John Smith"
                    />
                    <Input
                      label="Client Email"
                      value={draft.client.email}
                      onChange={(e) => setDraft({ ...draft, client: { ...draft.client, email: e.target.value } })}
                      placeholder="john@acme.com"
                      type="email"
                    />
                    <Input
                      label="Company"
                      value={draft.client.company}
                      onChange={(e) => setDraft({ ...draft, client: { ...draft.client, company: e.target.value } })}
                      placeholder="Acme Consulting"
                    />
                  </div>

                  {/* Terms */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Terms & Conditions</label>
                    <Textarea
                      value={draft.terms}
                      onChange={(e) => setDraft({ ...draft, terms: e.target.value })}
                      rows={4}
                      placeholder="Enter terms..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-default">
                    <Button variant="secondary" onClick={() => setStep(1)} className="w-full sm:w-auto">
                      <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setShowExportModal(true)}
                      className="w-full sm:w-auto flex-1"
                      size="lg"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" aria-hidden="true" />
                      Export & Send
                    </Button>
                  </div>
                </div>

                {/* Sidebar - Pricing Breakdown */}
                <div className="lg:sticky lg:top-24 space-y-6">
                  <div className="bg-surface-card border border-border-default rounded-xl p-6">
                    <h3 className="font-display text-lg font-semibold text-text-primary mb-4">Pricing Breakdown</h3>

                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-text-secondary">Base Rate</dt>
                        <dd className="font-medium text-text-primary">{formatPrice(draft.pricingBreakdown.baseRate)}/hr</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-secondary">Estimated Hours</dt>
                        <dd className="font-medium text-text-primary">{draft.pricingBreakdown.hoursEstimated} hrs</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-secondary">Complexity</dt>
                        <dd className="font-medium text-text-primary">{draft.pricingBreakdown.complexityMultiplier}x</dd>
                      </div>
                      <div className="flex justify-between border-t border-border-default pt-3">
                        <dt className="font-semibold text-text-primary">Subtotal</dt>
                        <dd className="font-semibold text-text-primary">{formatPrice(draft.pricingBreakdown.baseRate * draft.pricingBreakdown.hoursEstimated * draft.pricingBreakdown.complexityMultiplier)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/20">
                      <dt className="font-semibold text-brand-primary">Total</dt>
                      <dd className="font-display text-2xl font-bold text-brand-primary">{formatPrice(draft.pricing)}</dd>
                    </div>

                    <p className="mt-4 text-xs text-text-muted">
                      Edit the total price above to override. Breakdown recalculates automatically.
                    </p>
                  </div>

                  {/* Client Info Card */}
                  <div className="bg-surface-card border border-border-default rounded-xl p-6">
                    <h3 className="font-display text-lg font-semibold text-text-primary mb-4">Client Details</h3>
                    <div className="space-y-3 text-sm">
                      {draft.client.name && (
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Name</span>
                          <span className="font-medium text-text-primary">{draft.client.name}</span>
                        </div>
                      )}
                      {draft.client.email && (
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Email</span>
                          <span className="font-medium text-text-primary">{draft.client.email}</span>
                        </div>
                      )}
                      {draft.client.company && (
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Company</span>
                          <span className="font-medium text-text-primary">{draft.client.company}</span>
                        </div>
                      )}
                      {!draft.client.name && !draft.client.email && !draft.client.company && (
                        <p className="text-text-muted text-center py-4">Add client details in the editor</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Step 3: Export & Send */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto animate-slide-in text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-status-success-bg rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-bold text-text-primary mb-2">Proposal Ready!</h2>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">
              Your proposal has been generated and is ready to send. Choose how you&apos;d like to deliver it.
            </p>

            {shareLink && (
              <div className="mb-8 max-w-md mx-auto p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                <p className="text-sm font-medium text-text-primary mb-2">Shareable link (expires in 30 days)</p>
                <div className="flex gap-2">
                  <Input readOnly value={shareLink} className="text-xs font-mono" aria-label="Share link" />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink).then(() =>
                        toast({ type: "success", title: "Copied!", message: "Link copied to clipboard" })
                      );
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4 max-w-md mx-auto">
              <button
                onClick={() => setExportFormat("pdf")}
                className={cn(
                  "w-full p-6 rounded-xl border-2 transition-all",
                  exportFormat === "pdf"
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-border-default hover:border-brand-primary/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">PDF</h4>
                    <p className="text-sm text-text-muted">Professional, branded, read-only</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setExportFormat("word")}
                className={cn(
                  "w-full p-6 rounded-xl border-2 transition-all",
                  exportFormat === "word"
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-border-default hover:border-brand-primary/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Word (.docx)</h4>
                    <p className="text-sm text-text-muted">Fully editable for client changes</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setExportFormat("link")}
                className={cn(
                  "w-full p-6 rounded-xl border-2 transition-all",
                  exportFormat === "link"
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-border-default hover:border-brand-primary/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Secure Link</h4>
                    <p className="text-sm text-text-muted">Trackable, expires in 30 days</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleExport}
                isLoading={isExporting}
                size="lg"
                className="w-full sm:w-auto flex-1"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                    Generating...
                  </>
                ) : (
                  `Generate ${exportFormat.toUpperCase()}`
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSend}
                size="lg"
                className="w-full sm:w-auto"
              >
                Send via Email
              </Button>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="tertiary" onClick={() => setStep(2)} className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Back to Edit
              </Button>
              <Button variant="tertiary" onClick={() => setStep(1)} className="w-full sm:w-auto">
                Create Another
              </Button>
            </div>
          </div>
        )}

        {/* Export Modal */}
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Proposal"
          description="Choose your export format"
          size="md"
        >
          <div className="space-y-3">
            {["pdf", "word", "link"].map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format as "pdf" | "word" | "link")}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  exportFormat === format
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-border-default hover:border-brand-primary/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    format === "pdf" && "bg-red-100 text-red-600",
                    format === "word" && "bg-blue-100 text-blue-600",
                    format === "link" && "bg-green-100 text-green-600"
                  )}>
                    {format === "pdf" && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {format === "word" && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {format === "link" && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">{format.toUpperCase()}</h4>
                    <p className="text-sm text-text-muted">
                      {format === "pdf" && "Professional, branded, read-only"}
                      {format === "word" && "Fully editable for client"}
                      {format === "link" && "Trackable, expires in 30 days"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-default">
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} isLoading={isExporting}>
              {isExporting ? "Generating..." : `Generate ${exportFormat.toUpperCase()}`}
            </Button>
          </div>
        </Modal>
      </main>
    </div>
  );
}