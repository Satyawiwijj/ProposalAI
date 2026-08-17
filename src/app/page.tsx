"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { ArrowRight, Sparkles, Zap, ShieldCheck, MessageSquare } from "lucide-react";

const space = Space_Grotesk({ subsets: ["latin"], weight: ["400","500","600","700"] });
const dm = DM_Sans({ subsets: ["latin"], weight: ["400","500","700"] });

const testimonials = [
  { name: "Maya R.", role: "Freelance Designer", quote: "ProposalPilot turned my notes into a client-ready proposal in 47 seconds. They signed same day.", avatar: "https://i.pravatar.cc/100?img=32" },
  { name: "Jon K.", role: "Consultant", quote: "Finally a tool that sounds like me, not a template. Tracking lets me follow up at the perfect time.", avatar: "https://i.pravatar.cc/100?img=12" },
  { name: "Aisha P.", role: "Agency Owner", quote: "We onboarded the whole team. Consistency and speed we didn't think possible.", avatar: "https://i.pravatar.cc/100?img=5" },
];

export default function LandingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = setInterval(() => setIndex(i => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(id);
  }, [paused, reduceMotion]);

  return (
    <main className={`${dm.className} min-h-screen bg-[#FAF5FF] text-[#0F172A] antialiased selection:bg-[#7C3AED]/20`}>
      <style jsx global>{`
        :root { --color-primary:#7C3AED; --color-accent:#EC4899; --color-bg:#FAF5FF; --color-fg:#0F172A; }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:0.01ms !important; transition-duration:0.01ms !important } }
      `}</style>

      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#FAF5FF]/80 border-b border-[#EFE7FC]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className={`${space.className} font-semibold tracking-tight text-lg`}>ProposalPilot</div>
          <button onClick={() => router.push("/dashboard")} className="cursor-pointer rounded-lg px-4 py-2 bg-[#7C3AED] text-white font-medium hover:opacity-90 active:opacity-80 transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]">Open demo</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#EFE7FC] bg-white px-3 py-1 text-sm">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
              <span>AI proposals in under a minute</span>
            </div>
            <h1 className={`${space.className} mt-6 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight`}>
              Your next proposal, <span className="text-[#7C3AED]">priced and polished</span> in seconds.
            </h1>
            <p className="mt-5 text-lg text-[#475569] max-w-xl">
              Paste your notes. Get a proposal that sounds like you, with pricing, terms, and tracking links. No accounts needed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={() => router.push("/dashboard")} className="cursor-pointer group inline-flex items-center justify-center gap-2 rounded-xl bg-[#EC4899] text-black font-semibold px-6 py-3 hover:translate-y-[-1px] hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]">
                Open demo <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button className="cursor-pointer rounded-xl border border-[#EFE7FC] bg-white px-6 py-3 font-medium hover:bg-[#F7F3FD] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]">See how it works</button>
            </div>
            <p className="mt-3 text-xs text-[#475569]">Free to try • No credit card</p>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-[#EFE7FC] bg-white shadow-xl overflow-hidden">
              <div className="bg-[#F7F3FD] px-4 py-3 border-b border-[#EFE7FC] text-sm font-medium">Draft proposal</div>
              <div className="p-6 space-y-4">
                <div className="h-3 w-3/4 rounded bg-[#EFE7FC] animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-[#EFE7FC] animate-pulse [animation-delay:200ms]" />
                <div className="h-3 w-2/3 rounded bg-[#EFE7FC] animate-pulse [animation-delay:400ms]" />
                <div className="pt-4 flex items-center gap-2 text-[#7C3AED] font-medium">
                  <MessageSquare className="w-4 h-4" /> Streaming text demo
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white border-y border-[#EFE7FC]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <h2 className={`${space.className} text-3xl md:text-4xl font-semibold tracking-tight`}>The problem with proposals</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Slow to draft", desc: "Hours lost formatting and rewriting the same sections." },
              { icon: ShieldCheck, title: "Inconsistent voice", desc: "Templates sound generic, not you." },
              { icon: MessageSquare, title: "No follow-up signal", desc: "You never know if it was opened." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-[#EFE7FC] bg-[#FAF5FF] p-6 hover:shadow-md transition-shadow duration-200">
                <c.icon className="w-5 h-5 text-[#7C3AED]" aria-hidden="true" />
                <h3 className={`${space.className} mt-3 font-semibold`}>{c.title}</h3>
                <p className="mt-2 text-sm text-[#475569]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <h2 className={`${space.className} text-3xl md:text-4xl font-semibold tracking-tight`}>How it works</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Paste notes", desc: "Drop your scope, rates, and context." },
            { step: "2", title: "AI drafts", desc: "ProposalPilot writes, prices, and formats." },
            { step: "3", title: "Send & track", desc: "Share link, see opens, follow up smart." },
          ].map(s => (
            <div key={s.step} className="rounded-2xl border border-[#EFE7FC] bg-white p-6">
              <div className="text-sm font-semibold text-[#EC4899]">{s.step}</div>
              <div className={`${space.className} mt-2 font-semibold text-lg`}>{s.title}</div>
              <p className="mt-2 text-sm text-[#475569]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F7F3FD] border-y border-[#EFE7FC]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <h2 className={`${space.className} text-3xl md:text-4xl font-semibold tracking-tight`}>Loved by freelancers</h2>
          <div className="mt-8 relative rounded-2xl border border-[#EFE7FC] bg-white p-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="flex items-center gap-4">
              <img src={testimonials[index].avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold">{testimonials[index].name}</div>
                <div className="text-sm text-[#475569]">{testimonials[index].role}</div>
              </div>
            </div>
            <blockquote className="mt-4 text-lg leading-relaxed">“{testimonials[index].quote}”</blockquote>
            <div className="mt-6 flex items-center gap-2">
              <button aria-label="Previous" onClick={() => setIndex(i => (i - 1 + testimonials.length) % testimonials.length)} className="cursor-pointer rounded-lg border border-[#EFE7FC] px-3 py-1 hover:bg-[#FAF5FF] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]">Prev</button>
              <button aria-label="Next" onClick={() => setIndex(i => (i + 1) % testimonials.length)} className="cursor-pointer rounded-lg border border-[#EFE7FC] px-3 py-1 hover:bg-[#FAF5FF] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]">Next</button>
              <span className="ml-auto text-xs text-[#475569]">Slide {index + 1} of {testimonials.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="rounded-3xl bg-[#7C3AED] text-white p-10 md:p-14 text-center">
          <h2 className={`${space.className} text-3xl md:text-4xl font-bold`}>Start sending better proposals today</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">No signup required for demo. Paste notes, get a proposal.</p>
          <div className="mt-8 flex justify-center">
            <button onClick={() => router.push("/dashboard")} className="cursor-pointer rounded-xl bg-white text-[#7C3AED] font-semibold px-6 py-3 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white">Open demo</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EFE7FC] py-10 text-sm text-[#475569]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div>© {new Date().getFullYear()} ProposalPilot</div>
          <div className="flex gap-4">
            <a href="#" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded">Privacy</a>
            <a href="#" className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
