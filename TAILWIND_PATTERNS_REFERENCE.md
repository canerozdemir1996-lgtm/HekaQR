# Tailwind CSS & Custom Class Pattern Reference

## 🎯 Most Used CSS Patterns in HekaQR

### Layout Patterns

#### Flex Container (Default: Horizontal)
```tsx
className="flex items-center gap-2"
// Equivalent to: display: flex; align-items: center; gap: 0.5rem;
```
**Used for**: Navigation bars, button groups, inline lists

#### Flex Column (Vertical Stack)
```tsx
className="flex flex-col gap-4"
// Equivalent to: display: flex; flex-direction: column; gap: 1rem;
```
**Used for**: Form fields, vertical menus, stacked components

#### Grid Layout
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
// Responsive: 1 column mobile, 2 tablet, 3 desktop
```
**Used for**: QR list, feature cards, admin tables

#### Absolute Positioning
```tsx
className="absolute inset-0"
// Equivalent to: position: absolute; top: 0; right: 0; bottom: 0; left: 0;
```
**Used for**: Overlays, backdrop blur, full-screen modals

#### Sticky Header
```tsx
className="sticky top-0 z-10 bg-white/95 border-b"
// position: sticky; top: 0; stays in view on scroll
```
**Used for**: Dashboard headers, table headers

#### Fixed Positioning
```tsx
className="fixed inset-0 z-50"
// position: fixed; covers entire viewport
```
**Used for**: Modals, overlays, portal elements

---

### Spacing Patterns

#### Padding (Internal)
```tsx
p-4              /* padding: 1rem all sides */
px-3             /* padding: 0.75rem left-right */
py-2.5           /* padding: 0.625rem top-bottom */
pt-6 pb-4        /* padding: top then bottom */
```

#### Margin (External)
```tsx
mx-auto           /* margin: 0 auto (center horizontally) */
mt-1              /* margin-top: 0.25rem */
mb-2              /* margin-bottom: 0.5rem */
```

#### Gap (Container spacing)
```tsx
gap-2             /* gap: 0.5rem between flex/grid children */
gap-2.5           /* gap: 0.625rem */
gap-3             /* gap: 0.75rem */
gap-4             /* gap: 1rem */
gap-6             /* gap: 1.5rem */
```

#### Height/Width
```tsx
w-full            /* width: 100% */
w-14              /* width: 3.5rem (56px) */
h-9               /* height: 2.25rem (36px) */
min-w-0           /* min-width: 0 (for text truncation) */
max-w-md          /* max-width: 28rem (448px) */
```

---

### Styling Patterns

#### Border Radius
```tsx
rounded-xl        /* border-radius: 12px (cards, buttons, inputs) */
rounded-2xl       /* border-radius: 16px (modals, large surfaces) */
rounded-lg        /* border-radius: 8px (small elements) */
rounded-full      /* border-radius: 9999px (avatars, pills) */
```

#### Border & Styling
```tsx
border                        /* border: 1px solid */
border-white/10               /* border with 10% opacity */
border-violet-500/20          /* violet border with 20% opacity */
border-collapse               /* table borders collapse */
```

#### Shadows
```tsx
shadow-sm         /* box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) */
shadow-md         /* box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) */
shadow-lg         /* box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) */
shadow-2xl        /* box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) */
shadow-violet-500/30  /* colored shadow with opacity */
```

#### Colors
```tsx
/* Background */
bg-white          /* #ffffff */
bg-slate-900      /* #0f172a */
bg-white/5        /* rgba(255, 255, 255, 0.05) */
bg-white/95       /* rgba(255, 255, 255, 0.95) */
bg-gradient-to-br /* linear-gradient(135deg) */

/* Text */
text-white        /* color: #ffffff */
text-slate-400    /* color: #94a3b8 */
text-sm           /* font-size: 0.875rem */
text-xs           /* font-size: 0.75rem */
text-[10px]       /* arbitrary font size: 10px */
text-[11px]       /* arbitrary font size: 11px */

/* Border */
border-white/10   /* rgba(255, 255, 255, 0.1) */
border-slate-200  /* #e2e8f0 */
border-violet-500 /* #8b5cf6 */
```

---

### Typography Patterns

#### Font Weights
```tsx
font-thin         /* 100 */
font-light        /* 300 */
font-normal       /* 400 */
font-medium       /* 500 */
font-semibold     /* 600 */
font-bold         /* 700 */
font-extrabold    /* 800 */
font-black        /* 900 */
```

#### Text Sizing
```tsx
text-[10px]       /* Labels, small text */
text-xs           /* 0.75rem - 12px */
text-sm           /* 0.875rem - 14px */
text-base         /* 1rem - 16px */
text-lg           /* 1.125rem - 18px */
text-xl           /* 1.25rem - 20px */
text-2xl          /* 1.5rem - 24px */
text-7xl          /* 3.5rem - 56px */
```

#### Text Styling
```tsx
uppercase         /* text-transform: uppercase; */
lowercase         /* text-transform: lowercase; */
tracking-wider    /* letter-spacing: 0.05em; */
tracking-widest   /* letter-spacing: 0.1em; */
truncate          /* white-space: nowrap; overflow: hidden; text-overflow: ellipsis; */
line-clamp-2      /* -webkit-line-clamp: 2; display: -webkit-box; */
```

---

### Interactive Patterns

#### Hover States
```tsx
hover:opacity-90     /* Dynamic opacity on hover */
hover:bg-white/[0.03] /* Background color change */
hover:border-white/20 /* Border color change */
hover:scale-105      /* Slight scale up */
hover:shadow-lg      /* Shadow enhancement */
hover:text-white     /* Text color change */
```

#### Focus States
```tsx
focus:border-violet-500
focus:outline-none
focus-premium        /* Custom focus ring from globals.css */
```

#### Disabled States
```tsx
disabled:opacity-50      /* Faded appearance */
disabled:cursor-not-allowed
disabled:opacity-40
```

#### Group Hover (Parent-child)
```tsx
group hover:bg-white/5  /* Parent hover affects child */
group/b hover:bg-white  /* Named group */
```

---

### Transition & Animation Patterns

#### Transitions
```tsx
transition-all        /* all properties animate */
transition-colors     /* color-related properties */
transition-transform  /* transform animations */
transition-opacity    /* opacity changes */
transition-shadow     /* shadow changes */
duration-100          /* 100ms */
ease-in-out           /* cubic-bezier(0.4, 0, 0.2, 1) */
```

#### Animations (Custom)
```tsx
animate-fadein    /* slideIn from left - 280ms */
animate-fadeup    /* slideUp from bottom - 280ms */
animate-scalein   /* scale + slideUp - 180ms */
animate-blink     /* opacity pulse - 1050ms */
animate-spin      /* infinite rotation */
animate-pulse     /* opacity pulse */
```

---

### Backdrop & Glass Morphism

```tsx
/* Backdrop Blur */
backdrop-blur-md     /* blur(12px) */
backdrop-blur-xl     /* blur(20px) */
backdrop-blur-2xl    /* blur(40px) */
backdrop-blur-sm     /* blur(4px) */

/* Glass Classes from globals.css */
glass-dark           /* Dark glass effect with blur */
glass-light          /* Light glass effect with blur */

/* Usage */
className="fixed inset-0 bg-black/40 backdrop-blur-sm"
```

---

### Z-Index Hierarchy

```tsx
z-0       /* Default - content */
z-10      /* Sticky headers */
z-20      /* Dropdowns, popovers */
z-40      /* Side drawers */
z-50      /* Modals */
z-[9998]  /* Semi-transparent backdrop */
z-[9999]  /* Top-most elements (menus) */
```

---

### Opacity & Visibility

```tsx
opacity-0     /* display: none visually */
opacity-50    /* 50% transparency */
opacity-75    /* 75% transparency */
opacity-90    /* 90% opacity */
opacity-100   /* fully opaque */
invisible     /* visibility: hidden */
hidden        /* display: none */
```

---

### Responsive Display Patterns

```tsx
hidden              /* display: none */
block               /* display: block */
flex                /* display: flex */
grid                /* display: grid */

/* Responsive variants */
hidden md:flex      /* Hidden on mobile, flex on md+ */
block lg:grid       /* Block on small, grid on lg+ */
flex md:flex-row    /* Flex column by default, row on md+ */
```

---

### Positioning Utilities

```tsx
relative            /* position: relative */
absolute            /* position: absolute */
fixed               /* position: fixed */
sticky              /* position: sticky */
top-0               /* top: 0 */
right-0             /* right: 0 */
bottom-0            /* bottom: 0 */
left-0              /* left: 0 */
-translate-y-1/2    /* transform: translateY(-50%) */
-translate-x-1/2    /* transform: translateX(-50%) */
```

---

### Flex Utilities

```tsx
flex-1              /* flex: 1 1 0% */
flex-col            /* flex-direction: column */
flex-row            /* flex-direction: row */
flex-wrap           /* flex-wrap: wrap */
items-start         /* align-items: flex-start */
items-center        /* align-items: center */
items-end           /* align-items: flex-end */
justify-between     /* justify-content: space-between */
justify-center      /* justify-content: center */
justify-start       /* justify-content: flex-start */
shrink-0            /* flex-shrink: 0 */
```

---

### Grid Utilities

```tsx
grid-cols-1         /* grid-template-columns: repeat(1, minmax(0, 1fr)) */
grid-cols-2         /* 2-column grid */
grid-cols-3         /* 3-column grid */
auto-rows-max       /* grid-auto-rows: max-content */
gap-3               /* gap: 0.75rem */
```

---

## 📊 Component CSS Templates

### Card/Surface Template
```tsx
className={`
  rounded-2xl p-4 md:p-6
  border ${isDark ? "bg-[#0f1627] border-white/10" : "bg-white border-slate-200"}
  shadow-md hover:shadow-lg
  transition-all
`}
```

### Button Template
```tsx
className={`
  px-4 py-2.5 rounded-xl
  font-bold text-sm
  flex items-center justify-center gap-2
  transition-all
  disabled:opacity-50 disabled:cursor-not-allowed
  ${isPrimary ? "btn-premium text-white" : "border border-white/10"}
  focus-premium
`}
```

### Input Template
```tsx
className={`
  w-full
  px-4 py-3
  rounded-xl
  border text-sm
  outline-none transition-all
  ${isDark 
    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500" 
    : "bg-white border-slate-200 text-slate-900 focus:border-violet-400"}
  focus-premium
`}
```

### Modal/Overlay Template
```tsx
className={`
  fixed inset-0 z-50
  flex items-center justify-center
  p-4
  bg-black/60 backdrop-blur-md
  animate-fadein
`}
```

### Modal Content Template
```tsx
className={`
  w-full max-w-md
  rounded-2xl border shadow-2xl
  ${isDark ? "bg-[#0d1117]/92 border-white/[0.10]" : "bg-white/95 border-slate-200"}
  p-6 animate-scalein
  backdrop-blur-2xl
`}
```

---

## 🎨 Color Combinations Reference

### Dark Mode Card
```tsx
bg-[#0f1627]           /* Dark surface */
border-white/10        /* Subtle border */
text-slate-200         /* Text */
text-slate-500         /* Muted text */
hover:bg-white/5       /* Hover state */
```

### Light Mode Card
```tsx
bg-white               /* White surface */
border-slate-200       /* Light border */
text-slate-900         /* Dark text */
text-slate-400         /* Muted text */
hover:bg-slate-50      /* Hover state */
```

### Button States
```tsx
/* Normal */
bg-white/5 border-white/10 text-slate-400

/* Hover */
bg-white/[0.03] border-white/20 text-slate-300

/* Disabled */
opacity-50 cursor-not-allowed

/* Primary */
btn-premium (gradient background)
```

---

## 📈 Typography Hierarchy

```tsx
/* Heading 1 */
text-7xl font-black tracking-tight

/* Heading 2 */
text-4xl font-black mb-3

/* Heading 3 */
text-3xl font-bold

/* Body */
text-sm leading-relaxed

/* Small/Caption */
text-[10px] font-bold uppercase tracking-wider
text-xs text-slate-500

/* Code/Mono */
text-sm font-mono
```

---

## 🎯 Common Pattern Combinations

### Navigation Bar
```tsx
flex items-center justify-between
px-8 py-5
max-w-6xl mx-auto
bg-transparent
```

### Feature Grid
```tsx
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
```

### List Item
```tsx
flex items-center gap-3
px-4 py-3
rounded-lg
border-b
hover:bg-white/5
transition-colors
cursor-pointer
```

### Badge/Chip
```tsx
inline-flex
items-center gap-2
px-3 py-1.5
rounded-full
text-xs font-bold
bg-accent/15
text-accent
```

### Skeleton Loader
```tsx
w-14 h-14
rounded-xl
bg-slate-200 dark:bg-white/5
animate-pulse
```

---

**Generated**: 2026-03-23  
**Version**: 1.0  
**Total Patterns Documented**: 100+
