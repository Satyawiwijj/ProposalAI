"use client";

import { useState, useEffect } from "react";
import { Building2, FileText, Plug, Bell, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type TabId = "general" | "proposals" | "integrations" | "notifications" | "billing";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: "general", label: "General", icon: <Building2 className="w-4 h-4" aria-hidden="true" /> },
  { id: "proposals", label: "Proposals", icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
  { id: "integrations", label: "Integrations", icon: <Plug className="w-4 h-4" aria-hidden="true" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" aria-hidden="true" /> },
  { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" aria-hidden="true" /> },
];

const STORAGE_KEY = "proposalpilot.settings";

interface SettingsState {
  companyName: string;
  website: string;
  email: string;
  currency: string;
  timezone: string;
  defaultTerms: string;
  hourlyRate: string;
  complexityMultiplier: string;
  numberingScheme: string;
  defaultTimeline: string;
  emailProvider: string;
  emailApiKey: string;
  notifProposalViewed: boolean;
  notifProposalAccepted: boolean;
  notifProposalRejected: boolean;
  notifWeeklyDigest: boolean;
}

function loadSettings(): SettingsState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt storage
  }
  return defaults;
}

const defaults: SettingsState = {
  companyName: "Acme Consulting",
  website: "https://acme.example.com",
  email: "hello@acme.example.com",
  currency: "USD",
  timezone: "UTC",
  defaultTerms:
    "50% deposit on sign, 50% on delivery.\nUp to 3 rounds of revisions included.\nPayment due within 14 days of invoice.",
  hourlyRate: "150",
  complexityMultiplier: "1.35",
  numberingScheme: "PROP-{YEAR}-{SEQ}",
  defaultTimeline: "2 weeks",
  emailProvider: "resend",
  emailApiKey: "",
  notifProposalViewed: true,
  notifProposalAccepted: true,
  notifProposalRejected: false,
  notifWeeklyDigest: false,
};

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-sm text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none",
          checked ? "bg-brand-primary" : "bg-text-muted/30"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-card border border-border-default rounded-xl p-6">
      <h3 className="font-display text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-sm text-text-muted mt-0.5 mb-5">{description}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary mb-1.5">
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const s = data.settings;
        if (!s) return;
        setSettings({
          companyName: s.companyName ?? defaults.companyName,
          website: s.website ?? defaults.website,
          email: s.contactEmail ?? defaults.email,
          currency: s.defaultCurrency ?? defaults.currency,
          timezone: s.timezone ?? defaults.timezone,
          defaultTerms: s.defaultTerms ?? defaults.defaultTerms,
          hourlyRate: String(s.hourlyRate ?? defaults.hourlyRate),
          complexityMultiplier: String(s.complexityMultiplier ?? defaults.complexityMultiplier),
          numberingScheme: s.numberingScheme ?? defaults.numberingScheme,
          defaultTimeline: s.defaultTimeline ?? defaults.defaultTimeline,
          emailProvider: s.emailProvider ?? defaults.emailProvider,
          emailApiKey: s.emailApiKey ?? defaults.emailApiKey,
          notifProposalViewed: s.notifyProposalViewed ?? defaults.notifProposalViewed,
          notifProposalAccepted: s.notifyProposalAccepted ?? defaults.notifProposalAccepted,
          notifProposalRejected: s.notifyProposalRejected ?? defaults.notifProposalRejected,
          notifWeeklyDigest: s.notifyWeeklyDigest ?? defaults.notifWeeklyDigest,
        });
      })
      .catch(() => toast({ type: "error", title: "Couldn't load settings", message: "Falling back to local defaults." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: settings.companyName,
          website: settings.website,
          contactEmail: settings.email,
          defaultCurrency: settings.currency,
          timezone: settings.timezone,
          defaultTerms: settings.defaultTerms,
          hourlyRate: Number(settings.hourlyRate) || 150,
          complexityMultiplier: Number(settings.complexityMultiplier) || 1.35,
          numberingScheme: settings.numberingScheme,
          defaultTimeline: settings.defaultTimeline,
          emailProvider: settings.emailProvider,
          emailApiKey: settings.emailApiKey,
          notifyProposalViewed: settings.notifProposalViewed,
          notifyProposalAccepted: settings.notifProposalAccepted,
          notifyProposalRejected: settings.notifProposalRejected,
          notifyWeeklyDigest: settings.notifWeeklyDigest,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ type: "success", title: "Settings saved", message: "Your changes have been saved." });
    } catch {
      toast({ type: "error", title: "Couldn't save", message: "Server save failed; kept local copy." });
    }
  };

  return (
    <div className="min-h-screen bg-surface-background">
      <div className="container px-6 py-8 max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-muted text-sm mt-1">Manage your workspace, pricing defaults, and integrations.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab nav */}
          <nav className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible" aria-label="Settings sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-card"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Panel */}
          <div className="flex-1 space-y-6 min-w-0">
            {activeTab === "general" && (
              <>
                <SectionCard title="Company" description="Shown on proposal cover pages and invoices.">
                  <div>
                    <Label htmlFor="companyName">Company name</Label>
                    <Input id="companyName" value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" type="url" value={settings.website} onChange={(e) => update("website", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="email">Contact email</Label>
                    <Input id="email" type="email" value={settings.email} onChange={(e) => update("email", e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Default currency</Label>
                      <Select id="currency" value={settings.currency} onChange={(e) => update("currency", e.target.value)}>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="GBP">GBP — British Pound</option>
                        <option value="INR">INR — Indian Rupee</option>
                        <option value="AUD">AUD — Australian Dollar</option>
                        <option value="CAD">CAD — Canadian Dollar</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select id="timezone" value={settings.timezone} onChange={(e) => update("timezone", e.target.value)}>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="Asia/Singapore">Asia/Singapore</option>
                        <option value="Australia/Sydney">Australia/Sydney</option>
                      </Select>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Legal" description="Defaults can be overridden per proposal.">
                  <div>
                    <Label htmlFor="defaultTerms">Default terms & conditions</Label>
                    <Textarea id="defaultTerms" rows={4} value={settings.defaultTerms} onChange={(e) => update("defaultTerms", e.target.value)} />
                  </div>
                </SectionCard>
              </>
            )}

            {activeTab === "proposals" && (
              <>
                <SectionCard title="Pricing logic" description="How ProposalPilot calculates suggested prices.">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hourlyRate">Hourly rate ({settings.currency})</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        min={0}
                        value={settings.hourlyRate}
                        onChange={(e) => update("hourlyRate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="complexityMultiplier">Default complexity multiplier</Label>
                      <Select
                        id="complexityMultiplier"
                        value={settings.complexityMultiplier}
                        onChange={(e) => update("complexityMultiplier", e.target.value)}
                      >
                        <option value="1">1.00 — Simple (documented, no surprises)</option>
                        <option value="1.35">1.35 — Standard (recommended)</option>
                        <option value="1.75">1.75 — Complex (integrations, unknowns)</option>
                        <option value="2.25">2.25 — Very complex (migrations, legacy)</option>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    Suggested price = hourly rate × estimated hours × complexity multiplier. You always have final control before export.
                  </p>
                </SectionCard>

                <SectionCard title="Defaults" description="Pre-filled values for new proposals.">
                  <div>
                    <Label htmlFor="defaultTimeline">Default timeline</Label>
                    <Select id="defaultTimeline" value={settings.defaultTimeline} onChange={(e) => update("defaultTimeline", e.target.value)}>
                      <option>1 week</option>
                      <option>2 weeks</option>
                      <option>3 weeks</option>
                      <option>1 month</option>
                      <option>2 months</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="numberingScheme">Numbering scheme</Label>
                    <Input
                      id="numberingScheme"
                      value={settings.numberingScheme}
                      onChange={(e) => update("numberingScheme", e.target.value)}
                      placeholder="PROP-{YEAR}-{SEQ}"
                    />
                    <p className="text-xs text-text-muted mt-1.5">
                      Use {"{YEAR}"} and {"{SEQ}"} placeholders. Example: PROP-2026-001
                    </p>
                  </div>
                </SectionCard>
              </>
            )}

            {activeTab === "integrations" && (
              <>
                <SectionCard title="Email provider" description="Used for sending proposals from the Export step.">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emailProvider">Provider</Label>
                      <Select id="emailProvider" value={settings.emailProvider} onChange={(e) => update("emailProvider", e.target.value)}>
                        <option value="resend">Resend</option>
                        <option value="sendgrid">SendGrid</option>
                        <option value="smtp">SMTP (custom)</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="emailApiKey">API key</Label>
                      <Input
                        id="emailApiKey"
                        type="password"
                        value={settings.emailApiKey}
                        onChange={(e) => update("emailApiKey", e.target.value)}
                        placeholder="re_••••••••••••"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Coming soon" description="These integrations are on the roadmap and will unlock as you grow.">
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { name: "HubSpot CRM", desc: "Push sent proposals" },
                      { name: "Google Calendar", desc: "Deadline sync" },
                      { name: "Slack", desc: "View notifications" },
                    ].map((integration) => (
                      <div key={integration.name} className="border border-dashed border-border-default rounded-lg p-4 opacity-60">
                        <p className="text-sm font-medium text-text-primary">{integration.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{integration.desc}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </>
            )}

            {activeTab === "notifications" && (
              <SectionCard title="Notifications" description="Choose what you want to hear about.">
                <div className="divide-y divide-border-default">
                  <Toggle
                    checked={settings.notifProposalViewed}
                    onChange={(v) => update("notifProposalViewed", v)}
                    label="Proposal viewed"
                    description="Email me when a client opens my proposal link."
                  />
                  <Toggle
                    checked={settings.notifProposalAccepted}
                    onChange={(v) => update("notifProposalAccepted", v)}
                    label="Proposal accepted"
                    description="Celebrate the wins — email me the moment a proposal is accepted."
                  />
                  <Toggle
                    checked={settings.notifProposalRejected}
                    onChange={(v) => update("notifProposalRejected", v)}
                    label="Proposal rejected"
                    description="Email me when a proposal is rejected so I can follow up."
                  />
                  <Toggle
                    checked={settings.notifWeeklyDigest}
                    onChange={(v) => update("notifWeeklyDigest", v)}
                    label="Weekly digest"
                    description="A Monday summary of sent, viewed, and won proposals."
                  />
                </div>
              </SectionCard>
            )}

            {activeTab === "billing" && (
              <SectionCard title="Billing" description="Billing is not enabled yet — this app is a local prototype.">
                <div className="flex items-start gap-4 rounded-lg bg-brand-primary/5 border border-brand-primary/20 p-5">
                  <Check className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Prototype mode</p>
                    <p className="text-sm text-text-muted mt-1">
                      Plans, invoices, and payment methods will appear here when the product launches. Everything you build now stays free.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave}>Save changes</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
