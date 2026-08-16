import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const baseStyles = `
  inline-flex items-center justify-center gap-2
  font-body font-semibold
  rounded-lg
  transition-all duration-200 ease-out
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  min-h-[48px]
`;

const variants = {
  primary: `
    bg-brand-primary text-white
    hover:bg-brand-primary-hover
    active:bg-brand-primary
    focus-visible:ring-brand-primary
    shadow-sm
  `,
  secondary: `
    bg-surface-card text-brand-primary border border-brand-primary
    hover:bg-surface-background
    active:bg-slate-100
    focus-visible:ring-brand-primary
    shadow-sm
  `,
  tertiary: `
    bg-transparent text-brand-primary
    hover:text-brand-primary-hover
    active:text-brand-primary
    focus-visible:ring-brand-primary
    underline-offset-2
    hover:underline
  `,
};

const sizes = {
  sm: "px-3 py-2 text-sm min-h-[44px]",
  md: "px-5 py-3 text-base min-h-[48px]",
  lg: "px-6 py-3.5 text-lg min-h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && "w-full", className)}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";