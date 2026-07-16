/**
 * QR Publish Design System 2026
 * Modern UI/UX with 2026 Trends
 * - Neumorphism & Glassmorphism
 * - Micro-interactions & Smooth Animations
 * - AI-driven Personalization
 * - Accessibility First (WCAG AAA)
 * - Enhanced Motion & 3D Depth
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 TYPOGRAPHY SYSTEM - Variable Fonts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const typography = {
  // Headings - Bold, expressive
  heading: {
    xs: "text-lg font-black tracking-tight", // H5
    sm: "text-xl font-black tracking-tight", // H4
    md: "text-2xl font-black tracking-tight", // H3
    lg: "text-3xl font-black tracking-tight", // H2
    xl: "text-4xl font-black tracking-tight", // H1
  },

  // Body - Clean, readable
  body: {
    xs: "text-xs font-normal leading-relaxed",
    sm: "text-sm font-normal leading-relaxed",
    md: "text-base font-normal leading-relaxed",
    lg: "text-lg font-normal leading-relaxed",
  },

  // Labels - Uppercase, semibold
  label: {
    xs: "text-[10px] font-semibold uppercase tracking-widest",
    sm: "text-xs font-semibold uppercase tracking-widest",
    md: "text-sm font-semibold uppercase tracking-widest",
  },

  // Captions - Small, secondary
  caption: {
    xs: "text-[10px] font-medium text-opacity-70",
    sm: "text-xs font-medium text-opacity-70",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 COLOR SYSTEM - 2026 Modern Palette
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const colors = {
  primary: {
    50: "#f8f6ff",
    100: "#f0ebff",
    200: "#e6d9ff",
    300: "#d4b5ff",
    400: "#b87dff",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87",
  },

  secondary: {
    50: "#f0f5ff",
    100: "#e0ebff",
    200: "#c7d9ff",
    300: "#a4c1ff",
    400: "#7c9dff",
    500: "#6366f1", // Indigo
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
  },

  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },

  warning: {
    50: "#fefce8",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },

  danger: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
  },

  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔮 SHADOW SYSTEM - Depth & Neumorphism
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const shadows = {
  // Neumorphic shadows (subtle, refined)
  neuro: {
    sm: "0 1px 2px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 3px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
    lg: "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
    xl: "0 10px 20px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)",
  },

  // Glow shadows (neon, accent)
  glow: {
    primary: "0 0 20px rgba(168, 85, 247, 0.3)",
    secondary: "0 0 20px rgba(79, 70, 229, 0.3)",
    success: "0 0 20px rgba(34, 197, 94, 0.3)",
    warning: "0 0 20px rgba(245, 158, 11, 0.3)",
    danger: "0 0 20px rgba(239, 68, 68, 0.3)",
  },

  // Elevation system
  elevation: {
    0: "none",
    1: "0 2px 4px rgba(0,0,0,0.08)",
    2: "0 4px 8px rgba(0,0,0,0.1)",
    3: "0 8px 16px rgba(0,0,0,0.12)",
    4: "0 12px 24px rgba(0,0,0,0.14)",
    5: "0 16px 32px rgba(0,0,0,0.16)",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✨ COMPONENTS - Tailwind Classes (Glassmorphism)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const components = {
  // Glass Frosted Effect (2026 Trend)
  glass: {
    light: "bg-white/70 backdrop-blur-xl border border-white/20",
    dark: "bg-black/20 backdrop-blur-xl border border-white/10",
    card: "bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10",
  },

  // Button Variants
  button: {
    primary:
      "bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-lg hover:shadow-violet-500/50",
    secondary:
      "bg-violet-100 hover:bg-violet-200 text-violet-900 font-semibold dark:bg-violet-900/30 dark:hover:bg-violet-900/50 dark:text-violet-100",
    outline:
      "border border-violet-200 hover:border-violet-300 text-violet-600 dark:border-violet-800 dark:hover:border-violet-700 dark:text-violet-400",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
  },

  // Card Variants (Neumorphic + Glass)
  card: {
    primary: "bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl",
    glass: "bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl",
    elevated: "bg-white dark:bg-slate-900 rounded-2xl shadow-lg dark:shadow-2xl border border-slate-100 dark:border-slate-800",
  },

  // Input Variants
  input: {
    primary:
      "bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all",
    glass:
      "bg-white/50 dark:bg-white/[0.08] backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎬 ANIMATIONS - Micro-interactions (2026)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const animations = {
  // Entrance animations
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  slideDown: "animate-slide-down",
  slideIn: "animate-slide-in",
  scaleIn: "animate-scale-in",

  // Micro-interactions
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  shimmer: "animate-shimmer",
  glow: "animate-glow",
  float: "animate-float",

  // Transitions
  smooth: "transition-all duration-300 ease-out",
  smoothFast: "transition-all duration-150 ease-out",
  smoothSlow: "transition-all duration-500 ease-out",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 SPACING SYSTEM - 4px base
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RESPONSIVE BREAKPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const breakpoints = {
  xs: "320px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ♿ ACCESSIBILITY - WCAG AAA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const a11y = {
  // Focus states (keyboard navigation)
  focusRing:
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500",
  focusRingDark:
    "dark:focus:ring-violet-400 dark:focus:ring-offset-slate-900",

  // Skip links
  skipLink:
    "absolute -top-10 left-0 z-50 bg-violet-600 text-white px-4 py-2 rounded-b-lg focus:top-0 transition-all",

  // Visual indicators
  visualFocus:
    "ring-2 ring-offset-2 ring-violet-500 dark:ring-offset-slate-900",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 INTERACTION STATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const states = {
  hover: "hover:scale-105 hover:shadow-lg transition-transform duration-200",
  active: "active:scale-95 transition-transform duration-100",
  disabled: "opacity-50 cursor-not-allowed",
  loading: "opacity-60 pointer-events-none",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 GRADIENTS - Premium feel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const gradients = {
  brand:
    "background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);",
  premium:
    "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);",
  sunset:
    "background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);",
  ocean:
    "background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);",
  earth:
    "background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);",
};
