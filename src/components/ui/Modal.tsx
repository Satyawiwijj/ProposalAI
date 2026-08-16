"use client";

import { Fragment, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
      if (e.key === "Tab") {
        trapFocus(e);
      }
    };

    const trapFocus = (e: KeyboardEvent) => {
      if (!contentRef.current) return;
      const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    contentRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={contentRef}
        className={`${sizes[size]} w-full bg-surface-card rounded-2xl shadow-xl overflow-hidden animate-slide-up`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={description ? undefined : "modal-title"}
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-border-default">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;

  return createPortal(modalContent, document.body);
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  const confirmStyles = variant === "danger"
    ? "bg-status-error hover:bg-red-600 text-white"
    : "bg-brand-primary hover:bg-brand-primary-hover text-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2.5 text-sm font-medium text-brand-primary hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          disabled={isLoading}
          className={cn("px-4 py-2.5 text-sm font-medium rounded-lg", confirmStyles, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", variant === "danger" ? "focus-visible:ring-status-error" : "focus-visible:ring-brand-primary")}
        >
          {isLoading ? "Loading..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}