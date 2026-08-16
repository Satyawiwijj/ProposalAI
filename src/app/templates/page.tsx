"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  scope: string[];
  estimatedValue: string;
  usageCount: number;
  tags: string[];
}

interface ApiTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  scopeItems: { title: string }[];
  pricing: { baseRate?: number; estimatedRange?: number[] } | null;
  usageCount: number;
  isPublic: boolean;
}

const categoryLabels: Record<string, string> = {
  consulting: "Consulting",
  software: "Software",
  marketing: "Marketing",
  design: "Design",
};

function mapTemplate(t: ApiTemplate): Template {
  const range = t.pricing?.estimatedRange;
  return {
    id: t.id,
    name: t.name,
    category: categoryLabels[t.category] ?? t.category,
    description: t.description ?? "",
    scope: (t.scopeItems ?? []).map((s) => s.title),
    estimatedValue: range ? `$${range[0].toLocaleString()} - $${range[1].toLocaleString()}` : "Custom",
    usageCount: t.usageCount,
    tags: [categoryLabels[t.category] ?? t.category],
  };
}

async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch("/api/templates", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load templates");
  const data = await res.json();
  return (data.templates as ApiTemplate[]).map(mapTemplate);
}

const categories = ["All", "Consulting", "Software", "Marketing", "Design"];

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => toast({ type: "error", title: "Failed to load templates", message: "Could not load templates" }))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: Template) => {
    toast({
      type: "success",
      title: "Template loaded",
      message: `Opening ${template.name} in the proposal editor`,
    });
    router.push(`/create?template=${template.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-background">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-sm border-b border-border-default">
        <div className="container px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">Templates</h1>
            <p className="text-text-muted text-sm mt-0.5">Start from proven structures — customize and send in minutes</p>
          </div>
        </div>
      </header>

      <main id="main-content" className="container py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search templates"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  categoryFilter === cat
                    ? "bg-brand-primary text-white"
                    : "bg-surface-card text-text-secondary hover:bg-surface-background border border-border-default"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-surface-card border border-border-default rounded-xl" />
            ))}
          </div>
        ) : (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}
          role="list"
          aria-label="Templates"
        >
          {filteredTemplates.map((template) => (
            <article
              key={template.id}
              className="bg-surface-card border border-border-default rounded-xl p-6 hover:border-brand-primary/40 hover:shadow-md transition-all duration-200 flex flex-col"
              role="listitem"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                    <span className="text-xs font-medium text-brand-primary uppercase tracking-wide">
                      {template.category}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-text-primary truncate">
                    {template.name}
                  </h3>
                </div>
                <span className="flex-shrink-0 px-2 py-1 text-xs font-medium text-text-muted bg-surface-background rounded-full">
                  Used {template.usageCount}x
                </span>
              </div>

              <p className="text-text-secondary text-sm mb-4 line-clamp-2 flex-1">
                {template.description}
              </p>

              {/* Scope preview */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Scope Includes</h4>
                <ul className="space-y-1.5" role="list">
                  {template.scope.slice(0, 4).map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-primary" aria-hidden="true" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                  {template.scope.length > 4 && (
                    <li className="text-xs text-text-muted">+{template.scope.length - 4} more items</li>
                  )}
                </ul>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-medium text-text-secondary bg-surface-background rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Value & Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border-default mt-auto">
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-brand-primary">
                    {template.estimatedValue}
                  </p>
                  <p className="text-xs text-text-muted">Typical range</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleUseTemplate(template)}>
                    Use Template
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        )}

        {!isLoading && filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted mb-4">No templates match your search</p>
            <Button variant="secondary" onClick={() => { setSearchQuery(""); setCategoryFilter("All"); }}>
              Clear filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}