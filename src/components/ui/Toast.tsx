"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const typeStyles = {
  success: "border-l-4 border-status-success bg-status-success-bg",
  error: "border-l-4 border-status-error bg-status-error-bg",
  warning: "border-l-4 border-status-warning bg-status-warning-bg",
  info: "border-l-4 border-status-info bg-status-info-bg",
};

const typeIcons = {
  success: <CheckCircle className="w-5 h-5 text-status-success" aria-hidden="true" />,
  error: <AlertCircle className="w-5 h-5 text-status-error" aria-hidden="true" />,
  warning: <AlertTriangle className="w-5 h-5 text-status-warning" aria-hidden="true" />,
  info: <Info className="w-5 h-5 text-status-info" aria-hidden="true" />,
};

function ToastItem({ id, type, title, message, duration = 5000, action, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      className={cn("flex items-start gap-3 p-4 rounded-lg shadow-lg", typeStyles[type], "animate-slide-in", isExiting && "animate-fade-out")}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{typeIcons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary">{title}</p>
        {message && <p className="mt-1 text-sm text-text-secondary">{message}</p>}
        {action && (
          <button
            type="button"
            onClick={() => { action.onClick(); onClose(id); }}
            className="mt-2 text-sm font-medium text-brand-primary hover:text-brand-primary-hover underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const positions = {
  "top-right": "fixed top-6 right-6",
  "top-left": "fixed top-6 left-6",
  "bottom-right": "fixed bottom-6 right-6",
  "bottom-left": "fixed bottom-6 left-6",
};

export function ToastContainer({ toasts, onClose, position = "bottom-right" }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const container = (
    <div
      className={`${positions[position]} z-[600] flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none`}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );

  if (typeof window === "undefined") return null;

  return createPortal(container, document.body);
}

interface UseToastReturn {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

let toastId = 0;

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${toastId++}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return { toasts, toast, dismiss, dismissAll };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, dismiss } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={dismiss} />
    </>
  );
}