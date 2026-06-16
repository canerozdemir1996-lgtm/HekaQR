/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🎨 Extended Color Palette (2026 Modern)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      colors: {
        // Brand colors (Violet-based, premium feel)
        brand: {
          50: "#f8f6ff",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
        },
        // Glass effect colors
        glass: "rgba(255, 255, 255, 0.1)",
        "glass-dark": "rgba(0, 0, 0, 0.2)",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔮 Enhanced Shadow System
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      boxShadow: {
        // Neumorphic shadows
        "neuro-sm":
          "0 1px 2px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "neuro-md":
          "0 3px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
        "neuro-lg":
          "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
        "neuro-xl":
          "0 10px 20px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)",

        // Glow shadows (neon accent)
        "glow-primary": "0 0 20px rgba(168, 85, 247, 0.3)",
        "glow-secondary": "0 0 20px rgba(79, 70, 229, 0.3)",
        "glow-success": "0 0 20px rgba(34, 197, 94, 0.3)",
        "glow-warning": "0 0 20px rgba(245, 158, 11, 0.3)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.3)",

        // Elevation system
        elevation: {
          0: "none",
          1: "0 2px 4px rgba(0,0,0,0.08)",
          2: "0 4px 8px rgba(0,0,0,0.1)",
          3: "0 8px 16px rgba(0,0,0,0.12)",
          4: "0 12px 24px rgba(0,0,0,0.14)",
          5: "0 16px 32px rgba(0,0,0,0.16)",
        },
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 📐 Refined Border Radius
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      borderRadius: {
        xs: "0.375rem", // 6px
        sm: "0.5rem", // 8px
        md: "0.75rem", // 12px
        lg: "1rem", // 16px
        xl: "1.25rem", // 20px
        "2xl": "1.5rem", // 24px
        "3xl": "2rem", // 32px
        full: "9999px",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🎬 Advanced Animations (2026 Micro-interactions)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      animation: {
        // Entrance animations
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",

        // Micro-interactions
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "bounce-gentle": "bounceGentle 1s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        glow: "glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "blink-slow": "blink 1.2s ease-in-out infinite",

        // Loading animations
        "spin-slow": "spin 3s linear infinite",
        "pulse-wave": "pulseWave 1.5s ease-in-out infinite",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🎨 Keyframes for custom animations
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        glow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        blink: {
          "0%, 50%, 100%": { opacity: "1" },
          "25%, 75%": { opacity: "0.3" },
        },
        pulseWave: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔮 Backdrop Filters (Glassmorphism 2026)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
      },
      backdropOpacity: {
        5: "0.05",
        10: "0.1",
        20: "0.2",
        30: "0.3",
        40: "0.4",
        50: "0.5",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🎨 Gradients (Premium branding)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
        "gradient-premium":
          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "gradient-sunset":
          "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        "gradient-ocean":
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        "gradient-earth":
          "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        "gradient-subtle":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ⚡ Transitions & Easing
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },
      transitionTimingFunction: {
        "out-circ": "cubic-bezier(0, 0.55, 0.45, 1)",
        "in-circ": "cubic-bezier(0.6, 0.04, 0.98, 0.34)",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 📏 Refined Spacing Scale
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 📱 Custom Container
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      container: {
        center: true,
        padding: "1rem",
        screens: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
        },
      },

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ♿ Accessibility - Focus rings
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      ringColor: {
        DEFAULT: "rgba(168, 85, 247, 0.5)",
      },
      ringWidth: {
        DEFAULT: "2px",
      },
    },
  },
  plugins: [],
};
