/**
 * 🎨 HekaQR Button System 2026
 * Modern button variants with Glassmorphism, Neumorphism, and Micro-interactions
 */

import React from "react";
import { Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost" | "glass";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  isDark?: boolean;
  glow?: boolean;
  animated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIZE CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

const SIZES: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1.5 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm font-medium",
  lg: "px-6 py-3 text-base font-semibold",
  xl: "px-8 py-4 text-lg font-bold",
};

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT CONFIGURATIONS (Dark Mode)
// ─────────────────────────────────────────────────────────────────────────────

const VARIANTS_DARK: Record<ButtonVariant, string> = {
  // Primary: Gradient + Glow effect
  primary: `
    bg-gradient-to-r from-violet-500 to-indigo-600
    hover:from-violet-400 hover:to-indigo-500
    active:from-violet-600 active:to-indigo-700
    text-white font-semibold
    shadow-lg shadow-violet-500/50
    hover:shadow-violet-500/80 hover:shadow-2xl
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Secondary: Subtle glass
  secondary: `
    bg-white/10 backdrop-blur-md border border-white/20
    hover:bg-white/15 hover:border-white/30
    active:bg-white/10
    text-slate-100
    shadow-lg shadow-white/5
    hover:shadow-white/10
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Success: Emerald glow
  success: `
    bg-gradient-to-r from-emerald-500 to-teal-600
    hover:from-emerald-400 hover:to-teal-500
    active:from-emerald-600 active:to-teal-700
    text-white font-semibold
    shadow-lg shadow-emerald-500/40
    hover:shadow-emerald-500/70
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Warning: Amber with glow
  warning: `
    bg-gradient-to-r from-amber-500 to-orange-600
    hover:from-amber-400 hover:to-orange-500
    active:from-amber-600 active:to-orange-700
    text-white font-semibold
    shadow-lg shadow-amber-500/40
    hover:shadow-amber-500/70
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Danger: Red with prominent glow
  danger: `
    bg-gradient-to-r from-red-500 to-pink-600
    hover:from-red-400 hover:to-pink-500
    active:from-red-600 active:to-pink-700
    text-white font-semibold
    shadow-lg shadow-red-500/50
    hover:shadow-red-500/80
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Ghost: Minimal style
  ghost: `
    bg-transparent border border-white/20
    hover:bg-white/5 hover:border-white/30
    active:bg-white/10
    text-slate-200
    hover:text-slate-100
    transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Glass: Full glassmorphism
  glass: `
    bg-white/5 backdrop-blur-md border border-white/10
    hover:bg-white/10 hover:border-white/20
    active:bg-white/5
    text-slate-100
    shadow-lg shadow-white/10
    hover:shadow-white/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT CONFIGURATIONS (Light Mode)
// ─────────────────────────────────────────────────────────────────────────────

const VARIANTS_LIGHT: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-violet-500 to-indigo-600
    hover:from-violet-400 hover:to-indigo-500
    active:from-violet-600 active:to-indigo-700
    text-white font-semibold
    shadow-lg shadow-violet-500/30
    hover:shadow-violet-500/50
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  secondary: `
    bg-slate-100 border border-slate-200
    hover:bg-slate-50 hover:border-slate-300
    active:bg-slate-100
    text-slate-700
    shadow-md shadow-slate-200/50
    hover:shadow-slate-200/80
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  success: `
    bg-gradient-to-r from-emerald-500 to-teal-600
    hover:from-emerald-400 hover:to-teal-500
    active:from-emerald-600 active:to-teal-700
    text-white font-semibold
    shadow-lg shadow-emerald-500/30
    hover:shadow-emerald-500/50
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  warning: `
    bg-gradient-to-r from-amber-500 to-orange-600
    hover:from-amber-400 hover:to-orange-500
    active:from-amber-600 active:to-orange-700
    text-white font-semibold
    shadow-lg shadow-amber-500/30
    hover:shadow-amber-500/50
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  danger: `
    bg-gradient-to-r from-red-500 to-pink-600
    hover:from-red-400 hover:to-pink-500
    active:from-red-600 active:to-pink-700
    text-white font-semibold
    shadow-lg shadow-red-500/30
    hover:shadow-red-500/50
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  ghost: `
    bg-transparent border border-slate-300
    hover:bg-slate-50 hover:border-slate-400
    active:bg-slate-100
    text-slate-700
    hover:text-slate-900
    transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  glass: `
    bg-white/80 backdrop-blur-md border border-slate-200
    hover:bg-white/90 hover:border-slate-300
    active:bg-white/70
    text-slate-700
    shadow-lg shadow-slate-100/50
    hover:shadow-slate-100/80
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

// ─────────────────────────────────────────────────────────────────────────────
// BASE CLASSES (Applied to all buttons)
// ─────────────────────────────────────────────────────────────────────────────

const BASE = `
  inline-flex items-center justify-center gap-2
  rounded-xl font-semibold
  transition-all duration-300 ease-out
  focus:ring-2 focus:ring-offset-2 focus:ring-violet-500
  cursor-pointer
  whitespace-nowrap
  hover:scale-105 active:scale-95
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
`;

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON COMPONENT (React)
// ─────────────────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      isDark = true,
      glow = true,
      animated = true,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const variantClass = isDark ? VARIANTS_DARK[variant] : VARIANTS_LIGHT[variant];
    const sizeClass = SIZES[size];
    const widthClass = fullWidth ? "w-full" : "";

    const glowClass = glow && variant !== "ghost" ? "hover:shadow-glow-primary" : "";
    const animatedClass = animated ? "active:scale-95 hover:scale-105" : "";

    const finalClassname = `
      ${BASE}
      ${variantClass}
      ${sizeClass}
      ${widthClass}
      ${glowClass}
      ${animatedClass}
      ${className}
    `.trim().replace(/\s+/g, " ");

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={finalClassname}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {typeof children === "string" ? `${children}...` : children}
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="transition-transform duration-300 group-hover:rotate-3">
                {icon}
              </span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="transition-transform duration-300 group-hover:rotate-3">
                {icon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON GROUP (For organizing multiple buttons)
// ─────────────────────────────────────────────────────────────────────────────

export function ButtonGroup({
  children,
  className = "",
  vertical = false,
}: {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}) {
  const layout = vertical ? "flex flex-col gap-2" : "flex gap-2 items-center";
  return <div className={`${layout} ${className}`}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICON BUTTON (Compact icon-only button)
// ─────────────────────────────────────────────────────────────────────────────

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "size"> & { size?: "xs" | "sm" | "md" | "lg" }
>((props, ref) => {
  const sizeMap = {
    xs: "px-1.5 py-1.5",
    sm: "px-2.5 py-2.5",
    md: "px-3 py-3",
    lg: "px-4 py-4",
  };
  return (
    <Button
      {...props}
      ref={ref}
      className={`rounded-full ${sizeMap[props.size || "md"]} ${props.className || ""}`}
    />
  );
});

IconButton.displayName = "IconButton";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const getButtonClass = (
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  isDark: boolean = true
): string => {
  const variantClass = isDark ? VARIANTS_DARK[variant] : VARIANTS_LIGHT[variant];
  const sizeClass = SIZES[size];
  return `${BASE} ${variantClass} ${sizeClass}`.trim().replace(/\s+/g, " ");
};

// ─────────────────────────────────────────────────────────────────────────────
// QUICK BUTTON VARIANTS (Tailwind-compatible strings)
// ─────────────────────────────────────────────────────────────────────────────

export const buttonClasses = {
  // Primary action buttons
  primary: "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/50 hover:shadow-violet-500/80",

  // Secondary action buttons
  secondary: "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 text-slate-100 shadow-lg shadow-white/5",

  // Success/positive actions
  success: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/40",

  // Danger/destructive actions
  danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white font-semibold shadow-lg shadow-red-500/50",

  // Minimal/ghost buttons
  ghost: "bg-transparent border border-white/20 hover:bg-white/5 text-slate-200",

  // Glass morphism
  glass: "bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-slate-100 shadow-lg shadow-white/10",

  // Micro-interactions (applies to all)
  micro: "transition-all duration-300 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-violet-500",

  // Loading state
  loading: "opacity-75 cursor-not-allowed",

  // Disabled state
  disabled: "opacity-50 cursor-not-allowed",
};
