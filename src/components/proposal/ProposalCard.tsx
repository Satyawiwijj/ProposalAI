import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatDate } from "@/lib/utils";
import { CheckCircle, AlertCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";

interface ProposalCardProps {
  id: string;
  title: string;
  scope: string[];
  pricing: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected";
  sentAt?: string;
  onEdit: () => void;
  onView: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
};

const statusIcons = {
  draft: <Info className="w-3 h-3" aria-hidden="true" />,
  sent: <ExternalLink className="w-3 h-3" aria-hidden="true" />,
  viewed: <Info className="w-3 h-3" aria-hidden="true" />,
  accepted: <CheckCircle className="w-3 h-3" aria-hidden="true" />,
  rejected: <AlertCircle className="w-3 h-3" aria-hidden="true" />,
};

export function ProposalCard({
  id,
  title,
  scope,
  pricing,
  status,
  sentAt,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
}: ProposalCardProps) {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <article className="group bg-surface-card border border-border-default rounded-xl shadow-sm hover:border-brand-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className="bg-brand-primary text-white px-4 py-2 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold truncate">{title}</h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {statusIcons[status]}
          <span className="text-xs text-text-muted">
            {sentAt ? `Sent ${formatDate(sentAt)}` : "Not sent yet"}
          </span>
        </div>

        <ul className="space-y-2 mb-6" role="list" aria-label="Scope items">
          {scope.slice(0, 3).map((item, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-primary" aria-hidden="true" />
              <span className="truncate">{item}</span>
            </li>
          ))}
          {scope.length > 3 && (
            <li className="text-sm text-text-muted">
              +{scope.length - 3} more items
            </li>
          )}
        </ul>

        <div className="flex items-center justify-between pt-4 border-t border-border-default">
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-brand-primary">
              {formatPrice(pricing)}
            </p>
            <p className="text-xs text-text-muted">Total</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="tertiary" size="sm" onClick={onView}>
              View
            </Button>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            {onDuplicate && (
              <Button variant="tertiary" size="sm" onClick={onDuplicate}>
                Duplicate
              </Button>
            )}
            {onDelete && (
              <Button variant="tertiary" size="sm" onClick={onDelete} className="text-status-error hover:text-status-error">
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-20 h-20 mx-auto mb-6 text-text-muted/40 flex-shrink-0" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-muted max-w-xs mx-auto mb-6">
        {description}
      </p>
      {action && (
        <Button variant={action.variant || "primary"} onClick={action.onClick} className="w-full sm:w-auto">
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button variant="tertiary" onClick={secondaryAction.onClick} className="w-full sm:w-auto mt-3">
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  variant?: "card" | "list" | "editor" | "full";
  message?: string;
}

export function LoadingState({ variant = "card", message }: LoadingStateProps) {
  const shimmer = "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer";

  const skeleton = (
    <div className="space-y-4">
      {[...Array(variant === "editor" ? 5 : 3)].map((_, i) => (
        <div key={i} className={`h-4 ${shimmer} rounded w-3/4`} />
      ))}
    </div>
  );

  switch (variant) {
    case "card":
      return (
        <article className="bg-surface-card border border-border-default rounded-xl overflow-hidden">
          <div className={`h-9 ${shimmer}`} />
          <div className="p-6">
            <div className={`h-5 ${shimmer} rounded w-1/3 mb-4`} />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`h-4 ${shimmer} rounded w-5/6`} />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border-default">
              <div className={`h-10 ${shimmer} rounded w-24`} />
              <div className={`h-8 ${shimmer} rounded w-20`} />
            </div>
          </div>
        </article>
      );
    case "list":
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <LoadingState key={i} variant="card" />
          ))}
        </div>
      );
    case "editor":
      return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className={`h-6 ${shimmer} rounded w-1/2`} />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-4 ${shimmer} rounded w-3/4`} />
            ))}
          </div>
          <div className={`h-12 ${shimmer} rounded w-48`} />
        </div>
      );
    case "full":
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">{message || "Loading..."}</p>
          </div>
        </div>
      );
    default:
      return skeleton;
  }
}