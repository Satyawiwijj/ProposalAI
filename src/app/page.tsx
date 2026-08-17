"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { motion, useReducedMotion } from "motion/react";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!email.includes("@")) {
      setMessage("Enter a valid email address");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "demo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      setMessage(data.existing ? "Already on the list — you'll hear from us." : "You're on the list. First access emails go out soon.");
      setStatus("done");
    } catch {
      setMessage("Something went wrong. Try again or email me directly.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-surface-background flex flex-col">
      <header className="container max-w-4xl px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">ProposalPilot</h1>
          <p className="text-xs text-text-muted mt-0.5">Turn notes into proposals</p>
        </div>
        <Button variant="tertiary" size="sm" onClick={() => router.push("/dashboard")}>
          Open the demo →
        </Button>
      </header>

      <section className="container max-w-4xl px-6 flex-1 flex flex-col justify-center py-12">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <motion.h2 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
              className="font-display text-4xl sm:text-5xl font-bold text-text-primary leading-[1.05] tracking-tighter max-w-xl"
            >
              Your next proposal in under a minute.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.16,1,0.3,1] }}
              className="mt-4 text-base sm:text-lg text-text-muted max-w-xl leading-relaxed"
            >
              Paste notes. Get a priced proposal that sounds like you. Track opens.
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16,1,0.3,1] }}
            className="hidden lg:block"
          >
            <img 
              src="https://picsum.photos/seed/proposalpilot-hero/800/600" 
              alt="Freelancer reviewing proposal on laptop" 
              className="w-full rounded-2xl border border-border-default shadow-sm"
              loading="eager"
            />
          </motion.div>
        </div>

        <ul className="mt-8 space-y-3 max-w-xl">
          {[
            ["Learns your voice", "New drafts are calibrated against your past accepted proposals — tone, detail, terms."],
            ["Pricing you can trust", "Scope-driven hour estimates, checked against the budget they mentioned."],
            ["Every link is a tracking link", "Know when it's opened. Links expire in 30 days."],
          ].map(([title, body]) => (
            <li key={title} className="flex gap-3">
              <svg className="w-5 h-5 mt-0.5 text-brand-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-text-secondary">
                <span className="font-semibold text-text-primary">{title}.</span> {body}
              </p>
            </li>
          ))}
        </ul>

        <div id="waitlist" className="mt-10 max-w-xl">
          <label htmlFor="waitlist-email" className="block text-sm font-medium text-text-primary mb-2">
            Get early access - free while in beta
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="waitlist-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle") setStatus("idle");
              }}
              className="sm:flex-1"
              aria-label="Email address"
            />
            <Button onClick={submit} isLoading={status === "loading"} disabled={status === "done"}>
              {status === "done" ? "You're in" : "Get early access"}
            </Button>
          </div>
          {message && (
            <p
              className={`mt-2 text-sm ${status === "error" ? "text-status-error" : "text-text-muted"}`}
              role="status"
            >
              {message}
            </p>
          )}
          <p className="mt-2 text-xs text-text-muted">No accounts yet, no spam — just a heads-up when access opens.</p>
        </div>
      </section>

      <footer className="container max-w-4xl px-6 py-6 border-t border-border-default">
        <p className="text-xs text-text-muted">
          Demo workspace uses shared sample data. Built by a freelancer, for freelancers.
        </p>
      </footer>
    </main>
  );
}
