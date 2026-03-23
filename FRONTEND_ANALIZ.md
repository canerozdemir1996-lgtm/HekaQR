# HekaQR Frontend Arayüzü - Detaylı Analiz Raporu

## 📑 İçerikler
1. [Sayfa Bileşenleri Haritası](#sayfa-bileşenleri-haritası)
2. [Tasarım Sistemi](#tasarım-sistemi)
3. [Dark/Light Mode Implementasyonu](#darklight-mode-implementasyonu)
4. [Responsive Design Patterns](#responsive-design-patterns)
5. [İcon Kütüphanesi](#icon-kütüphanesi)
6. [CSS/Tailwind Pattern Analizi](#cesstailwind-pattern-analizi)
7. [Animation & Transition](#animation--transition)
8. [Component Architecture](#component-architecture)

---

## 1. Sayfa Bileşenleri Haritası

### 📊 Kullanıcı Dashboard
```
/app/dashboard/
├── page.tsx                 ✅ Ana dashboard (QR listesi, arama, filtreleme)
├── bartender/page.tsx       ✅ Bartender export (Excel çıktı)
├── bulk/page.tsx            ✅ Toplu QR oluşturma (CSV upload)
├── messages/page.tsx        ✅ Sistem mesajları (Toast notlar)
├── studio/[id]/page.tsx     ✅ QR tasarım editörü (Advanced styling)
├── templates/page.tsx       ✅ QR şablonları (Gradient, logo vb.)
└── vcard-builder/page.tsx   ✅ Dijital kartvizit oluşturucu
```

### 👤 Admin Interface
```
/app/admin/
├── page.tsx                 ✅ Overview (İstatistikler, kullanıcılar)
├── analytics/page.tsx       ✅ Global analitik (Tüm sistemin istatistikleri)
├── messages/page.tsx        ✅ Admin mesaj sistemi
└── users/page.tsx           ✅ Kullanıcı yönetimi (CRUD)
```

### 🔐 Authentication
```
/app/
├── login/page.tsx           ✅ Giriş sayfası (E-posta/Şifre)
├── page.tsx                 ✅ Landing page (Açılış sayfası)
└── auth/
    ├── force-change/page.tsx ✅ Zorunlu şifre değiştirme
    └── reset/page.tsx       ✅ Şifre sıfırlama
```

### 🎴 Public Pages
```
/app/card/
└── [slug]/page.tsx          ✅ vCard landing page (Dinamik yönlendirme)
    └── VCardPageClient.tsx  ✅ İstemci renderla edici
```

---

## 2. Tasarım Sistemi

### 🎨 Renk Palette

#### Dark Mode (Varsayılan)
| Token | Değer | Kullanım |
|-------|-------|---------|
| `--bg0` | `#070914` | Arka plan (Ambient) |
| `--bg1` | `rgba(255,255,255,0.035)` | Surface (Cardlar, Modals) |
| `--bg2` | `rgba(255,255,255,0.06)` | Hover state |
| `--bdr` | `rgba(255,255,255,0.09)` | Border color |
| `--tx` | `#f1f5f9` | Metin (Slate-100) |
| `--sub` | `rgba(148,163,184,0.78)` | Alt metin/Placeholder |

#### Light Mode
| Token | Değer | Kullanım |
|-------|-------|---------|
| `--bg0` | `#f6f7fb` | Arka plan (Açık) |
| `--bg1` | `rgba(255,255,255,0.88)` | Surface (Beyaz tone) |
| `--bdr` | `rgba(15,23,42,0.12)` | Border (Koyu) |
| `--tx` | `#0f172a` | Metin (Slate-900) |

#### Accent Renkler
| Token | Değer | Nihai Renk | Kullanım |
|-------|-------|-----------|---------|
| `--accent` | `#7c3aed` | Violet-700 | Primary buttons, highlights |
| `--accent2` | `#4f46e5` | Indigo-600 | Secondary, gradients |
| `--good` | `#10b981` | Emerald-500 | Success states |
| `--warn` | `#f59e0b` | Amber-500 | Warnings |
| `--bad` | `#ef4444` | Red-500 | Errors |

#### Gradient Kombinasyonları
```css
/* Primary Gradient */
linear-gradient(135deg, #7c3aed, #4f46e5)  /* Violet → Indigo */

/* Premium Text Gradient */
linear-gradient(90deg, #a78bfa, #818cf8)   /* Light Purple → Light Blue */

/* Backdrop Blur Gradients */
radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.20), transparent 55%)
```

### 📐 Typography

#### Font Stack
```css
--font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial
```

#### Font Weights (Inter)
- 300 (Light) - Subtle text
- 400 (Regular) - Body text
- 500 (Medium) - UI elements
- **600-700** (Semibold-Bold) - Headings
- **800-900** (Extrabold-Black) - CTA buttons, titles

#### Typography Scale
| Kullanım | Örnek | Ağırlık |
|----------|--------|---------|
| Labels | `text-[10px] font-bold uppercase tracking-wider` | 700 |
| Body | `text-sm` / `text-base` | 400-500 |
| Headings | `text-2xl font-black` | 900 |
| CTA Buttons | `font-bold text-sm` | 700 |

### 🎯 Spacing System

#### Applied Scales
- **Micro**: `2px`, `4px`, `6px` (Gaps, micro-spacing)
- **Small**: `8px` (`.5`), `12px` (`.75`), `16px` (1)
- **Medium**: `24px`, `32px`, `48px`
- **Large**: `64px`, `80px`, `96px`

#### Tailwind Spacing Usage
```tailwind
gap-2    /* 8px */
gap-2.5  /* 10px */
gap-3    /* 12px */
gap-4    /* 16px */
p-4      /* 16px padding */
py-3     /* 12px vertical */
rounded-xl   /* 12px radius */
rounded-2xl  /* 16px radius */
```

### 🔲 Border Radius
```css
rounded-xl   → 12px  /* Cards, Inputs, Buttons */
rounded-2xl  → 16px  /* Modals, Large Cards */
rounded-full → 999px /* Avatars, Badges */
```

### 📦 Shadow System

#### CSS Variables
```css
--shadow-soft: 0 18px 60px rgba(0,0,0,0.35)   /* Deep shadows */
--shadow-card: 0 14px 40px rgba(0,0,0,0.28)   /* Card shadows */
```

#### Tailwind Shadows
- `shadow-sm` - Button hover effects
- `shadow-2xl` - Modal backgrounds
- `shadow-lg shadow-violet-{color}/30` - Accent shadows

---

## 3. Dark/Light Mode Implementasyonu

### 🌗 Theme Module (`lib/theme.ts`)

#### Storage & Detection
```typescript
// LocalStorage key
const KEY = "qrhub-theme"
const DEFAULT: Theme = "light"

// Stored theme retrieval
export function getStoredTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) || DEFAULT
}

// Theme persistence
export function setStoredTheme(t: Theme) {
  localStorage.setItem(KEY, t)
  // HTML class toggle for Tailwind
  document.documentElement.classList.toggle("dark", t === "dark")
  // Custom data attribute
  document.documentElement.setAttribute("data-theme", t)
}
```

#### React Hook
```typescript
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(DEFAULT)

  useEffect(() => {
    const stored = getStoredTheme()
    setTheme(stored)
    // Sync HTML element with stored preference
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark"
      setStoredTheme(next)
      return next
    })
  }, [])

  return [theme, toggle]
}
```

### 🎭 CSS Custom Properties Dual Support

#### HTML Element Classes
```html
<!-- Dark mode (default) -->
<html class="dark" data-theme="dark">

<!-- Light mode -->
<html data-theme="light">
```

#### CSS Selectors
```css
/* Dark theme defaults */
:root {
  --bg0: #070914;
  --accent: #7c3aed;
}

/* Light theme overrides */
html[data-theme="light"] {
  --bg0: #f6f7fb;
  --accent: #7c3aed; /* Same accent */
}
```

### 🖼️ Tailwind Dark Mode Support
```tsx
// Example usage in component
className={isDark 
  ? "bg-[#0f1627] border-white/10" 
  : "bg-white border-slate-200"
}

// Or using Tailwind's dark: prefix
className="bg-white dark:bg-[#0f1627]"
```

### 🎛️ Theme Toggle Implementation
```tsx
const [theme, toggleTheme] = useTheme()
const isDark = theme === "dark"

// Toggle button
<button onClick={toggleTheme}>
  {isDark ? <Sun /> : <Moon />}
</button>
```

---

## 4. Responsive Design Patterns

### 📱 Breakpoints Used
```tailwind
sm  → 640px
md  → 768px
lg  → 1024px
```

### 🎯 Responsive Patterns

#### 1. **Fluid Layouts**
```tsx
className="max-w-6xl mx-auto px-8"  /* Center with padding */
className="w-full md:max-w-2xl"     /* Responsive width */
className="p-4 md:p-6 lg:p-8"       /* Padding scaling */
```

#### 2. **Grid Adaptation**
```tsx
/* Desktop: 3 columns, Tablet: 2, Mobile: 1 */
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

/* Example from dashboard */
className="grid grid-cols-2 gap-3"  /* 2col on all, gaps scale */
```

#### 3. **Hidden/Visible States**
```tsx
className="hidden sm:block"         /* Hidden mobile */
className="md:flex-row flex-col"    /* Stack on mobile */
className="w-full max-w-sm"         /* Mobile → limited width */
```

#### 4. **Flexible Card Layout**
```tsx
// Dashboard QR list - Responsive grid
className="grid auto-rows-max gap-3"  /* Auto-height rows */
className="rounded-2xl p-4 md:p-6"     /* Padding adaptation */
```

#### 5. **Modal Responsiveness**
```tsx
className="fixed inset-0 flex items-center justify-center p-4"
className="w-full max-w-md"  /* Modal width */
className="max-h-[calc(100vh-2rem)]"  /* Max height with spacing */
```

### 📐 Responsive Typography
```tsx
h1: className="text-5xl md:text-7xl" /* 40px → 56px → 84px */
p:  className="text-sm md:base"      /* Text size scaling */
```

### 🔄 Flexbox & Grid Utilities
```tsx
flex items-center gap-2          /* Horizontal alignment */
flex flex-col gap-3              /* Vertical stack */
grid grid-cols-2 gap-2           /* 2-column grid */
```

---

## 5. İcon Kütüphanesi

### 📚 Source & Package
**Library**: `lucide-react` (24px default)

### 🎨 Kullanılan İconlar

#### Navigation & UI
- `Home`, `ChevronRight`, `ChevronDown`, `X`, `Menu`
- `MoreHorizontal`, `Settings`, `HelpCircle`

#### QR Operations
- `QrCode` - QR görseli
- `Plus` - Yeni oluştur
- `Copy` - Kopyala
- `Download` - İndir
- `Trash2` - Sil
- `Pencil` - Düzenle
- `Eye`, `EyeOff` - Gözle/gizle

#### Analytics
- `BarChart2`, `BarChart3`, `TrendingUp`
- `Activity` - Gerçek zamanlı aktivite
- `LineChart` - Trend grafikler

#### Device/Platform
- `Smartphone`, `Monitor`, `Tablet`
- `Wifi` - WiFi QR type
- `Globe` - Website/URL
- `Mail` - Email type
- `Phone` - Telefon type
- `MessageSquare` - SMS type

#### Feature Icons
- `Sparkles` - Premium/Magic
- `Wand2` - Tasarım/Styling
- `Palette` - Renk/Şablon
- `Shuffle` - A/B test
- `Shield` - Güvenlik
- `Lock` - Şifre

#### User & Auth
- `UserCircle`, `Users`
- `LogOut`, `Power`
- `KeyRound` - Şifre reset
- `Mail` - E-posta

#### Data
- `FileSpreadsheet`, `FileText`, `FileImage`
- `Upload` - Dosya yükleme
- `Download` - Dosya indirme

#### Status
- `Check`, `CheckCircle2`, `CheckSquare`
- `AlertCircle`, `AlertTriangle`
- `Loader2` - Loading spinner
- `RefreshCw` - Yenile

#### Media
- `Image as ImageIcon`
- `Star` - Favorit
- `Tag` - Etiket

### 🎯 Icon Sizing Convention
```tsx
/* Toolbar/Header icons */
size={16}  → Small UI elements

/* Button icons */
size={14-15} → Buttons

/* Card/List icons */
size={18-20} → Medium elements

/* Hero/Large sections */
size={24-32} → Large displays
```

### 🎨 Icon Styling
```tsx
{/* With color */}
<QrCode className="text-violet-400" />

{/* With animation */}
<Loader2 className="animate-spin" />

{/* With opacity */}
<ChevronDown className="opacity-50" />

{/* Conditional styling */}
<Eye className={isDark ? "text-slate-500" : "text-slate-400"} />
```

---

## 6. CSS/Tailwind Pattern Analizi

### 🎪 Custom CSS Classes (`globals.css`)

#### Animation Keyframes
```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(10px) }
  to { opacity: 1; transform: translateY(0) }
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateX(16px) }
  to { opacity: 1; transform: translateX(0) }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94) translateY(-4px) }
  to { opacity: 1; transform: scale(1) translateY(0) }
}

@keyframes blink {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
}
```

#### Animation Utilities
```css
.animate-fadeup   { animation: fadeSlideUp 0.28s cubic-bezier(0.22,1,0.36,1) both }
.animate-fadein   { animation: fadeSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both }
.animate-scalein  { animation: scaleIn 0.18s cubic-bezier(0.22,1,0.36,1) both }
.animate-blink    { animation: blink 1.05s ease-in-out infinite }
```

#### Glass Morphism
```css
.glass-dark {
  background: rgba(7,9,15,0.88);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px);
}

.glass-light {
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px);
}
```

#### Premium Utilities
```css
.app-bg {
  background:
    radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.20), transparent 55%),
    radial-gradient(900px 500px at 85% 25%, rgba(79,70,229,0.16), transparent 55%),
    radial-gradient(700px 450px at 50% 90%, rgba(236,72,153,0.10), transparent 55%),
    var(--bg0);
}

.surface {
  background: var(--bg1);
  border: 1px solid var(--bdr);
  box-shadow: var(--shadow-card);
}

.btn-premium {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  box-shadow: 0 16px 40px rgba(124,58,237,0.22);
}

.focus-premium:focus {
  outline: none;
  box-shadow: var(--ring);
}
```

### 📊 Tailwind Pattern Envanteri

#### **Layout Patterns**
| Pattern | Kullanım | Örnek |
|---------|----------|--------|
| Flex Container | Hizalama | `flex items-center justify-between` |
| Üst/Alt Stack | Dikey | `flex flex-col gap-4` |
| Grid | Multi-column | `grid grid-cols-3 gap-4` |
| Absolute Positioning | Overlay | `absolute inset-0` |
| Sticky | Sabit başlık | `sticky top-0 z-10` |
| Fixed | Modal/Overlay | `fixed inset-0 z-50` |

#### **Spacing Classes**
```tailwind
p-4    → padding: 1rem
px-3   → padding-x: 0.75rem
py-2.5 → padding-y: 0.625rem
gap-2  → gap: 0.5rem
mt-1   → margin-top: 0.25rem
mb-2   → margin-bottom: 0.5rem
```

#### **Color Classes**
```tailwind
bg-white/5           → background: rgba(255,255,255,0.05)
text-slate-400       → color: #94a3b8
border-violet-500/20 → border: rgba(139,92,246,0.2)
```

#### **Border & Radius**
```tailwind
rounded-xl       → border-radius: 12px
rounded-2xl      → border-radius: 16px
border-white/10  → border: 1px solid rgba(255,255,255,0.1)
```

#### **Display & Visibility**
```tailwind
hidden sm:block      /* Hidden on mobile, visible on sm+ */
flex lg:grid         /* Flex on small, grid on lg+ */
block md:flex        /* Block on mobile, flex on md+ */
```

#### **Effects & Filters**
```tailwind
opacity-50           /* opacity: 0.5 */
shadow-2xl           /* Large shadow */
backdrop-blur-md     /* blur(12px) */
transition-all       /* smooth transitions */
hover:opacity-90     /* Hover state */
disabled:opacity-40  /* Disabled state */
```

### 🎯 Component Styling Pattern

#### **Card Template**
```tsx
className={`
  rounded-2xl p-4
  border ${isDark ? "bg-[#0f1627] border-white/10" : "bg-white border-slate-200"}
  shadow-md hover:shadow-lg transition-shadow
`}
```

#### **Button Template**
```tsx
className={`
  px-4 py-2.5 rounded-xl font-bold text-sm
  flex items-center gap-2 justify-center
  transition-all disabled:opacity-50
  ${isPrimary ? "btn-premium text-white" : "border border-white/10 text-slate-400"}
`}
```

#### **Input Template**
```tsx
className={`
  w-full px-4 py-3 rounded-xl
  border text-sm outline-none transition-all
  ${isDark 
    ? "bg-white/5 border-white/10 text-white focus:border-violet-500" 
    : "bg-white border-slate-200 focus:border-violet-400"}
  focus-premium
`}
```

#### **Modal Template**
```tsx
className={`
  fixed inset-0 z-50 flex items-center justify-center
  bg-black/60 backdrop-blur-md animate-fadein p-4
`}
```

---

## 7. Animation & Transition

### 🎬 Transition System

#### Global Transition
```css
*, *::before, *::after {
  transition-property: background-color, border-color, color, opacity, transform, box-shadow;
  transition-duration: 100ms;
  transition-timing-function: cubic-bezier(0.4,0,0.2,1);
}
```

### 🎨 Keyframe Animations

#### Fade Slide Up (Entry)
```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeup { animation: fadeSlideUp 0.28s cubic-bezier(0.22,1,0.36,1) both; }
```
**Kullanım**: Content entry, dropdown açılış

#### Fade Slide In (Horizontal)
```css
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.animate-fadein { animation: fadeSlideIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
```
**Kullanım**: Drawer, sidebar, menu açılış

#### Scale In (Modal Entry)
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-scalein { animation: scaleIn 0.18s cubic-bezier(0.22,1,0.36,1) both; }
```
**Kullanım**: Modal açılış, dropdown, popover

#### Blink (Loading State)
```css
@keyframes blink {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
}
.animate-blink { animation: blink 1.05s ease-in-out infinite; }
```
**Kullanım**: Skeleton loading, pulse effect

### ⚙️ Tailwind Animations
```tailwind
animate-spin    /* Infinite rotation (Loader) */
animate-pulse   /* Fade in/out pulse */
animate-bounce  /* Subtle bounce */
```

### 🎯 Animation Implementasyonları

#### **Loading State**
```tsx
<Loader2 size={20} className="animate-spin text-violet-400" />
```

#### **Modal Entry**
```tsx
className="fixed inset-0 z-50 animate-fadein"
{/* Modal content */}
<div className="animate-scalein">
```

#### **Drawer Animation**
```tsx
className="animate-fadein backdrop-blur-sm"
```

#### **Dropdown Menu**
```tsx
{open && (
  <div className="animate-scalein">
    {/* Menu items */}
  </div>
)}
```

### 🌠 Easing Functions
```css
cubic-bezier(0.22, 1, 0.36, 1)  /* Smooth bounce */
cubic-bezier(0.4, 0, 0.2, 1)    /* Standard easing */
ease-in-out                      /* Blink animation */
```

---

## 8. Component Architecture

### 🏗️ Component Hierarchy

#### **Layout Components**
```
RootLayout
├── ClientProviders
│   ├── ToastProvider
│   ├── BigAlertProvider
│   └── UserHeartbeat
│       └── RealtimeOwnerMessages
└── {children}
```

#### **Page Components**
```
Dashboard
├── ProfileMenu
├── CreateQRModal
├── TemplatesSection
├── BulkSection
├── OnboardingTour
└── QR List
    └── ActionMenu (More)
```

### 📦 Reusable Components

#### **1. ProfileMenu** (`components/ProfileMenu.tsx`)
```tsx
export function ProfileMenu({
  email: string;
  role?: string;
  isDark: boolean;
  onLogout: () => Promise<void> | void;
  avatarUrl?: string | null;
}): JSX.Element
```
**Features**:
- Avatar display (gravatar or uploaded)
- Password reset email
- Profile settings
- Role display
- Responsive dropdown

#### **2. CreateQRModal** (`components/CreateQRModal.tsx`)
```tsx
export default function CreateQRModal({
  onClose: () => void;
  onSuccess: (qr: QrCode) => void;
  editing?: QrCode | null;
  theme?: "dark" | "light";
}): JSX.Element
```
**Features**:
- 8+ QR type support (URL, WiFi, vCard, SMS, Email, etc.)
- Advanced rules (device redirect, geo-redirect, schedule)
- UTM tracking parameters
- vCard inline preview
- Style selection

#### **3. BulkSection** (`components/BulkSection.tsx`)
```tsx
export default function BulkSection({
  onCreated: (qrs: QrCode[]) => void;
  isDark: boolean;
}): JSX.Element
```
**Features**:
- CSV parser (Title, URL columns)
- Batch QR creation
- Style template selection
- Success/Error reporting

#### **4. TemplatesSection** (`components/TemplatesSection.tsx`)
```tsx
// QR design studio for custom styles
type Panel = "dots" | "eyes" | "colors" | "logo" | "advanced";
```
**Features**:
- Dot shape selection
- Gradient support
- Eye frame styling
- Logo embedding
- Live preview

#### **5. OnboardingTour** (`components/OnboardingTour.tsx`)
- First-time user guidance
- Feature highlights
- Tooltips and hints

#### **6. PhoneInput** (`components/PhoneInput.tsx`)
- International phone number formatting
- Country code selection
- Used in vCard creation

#### **7. Toast System** (`components/toast.tsx`)
```tsx
type ToastType = "success" | "error" | "info"

export function useToast(): {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}
```
**Features**:
- Multiple notification types
- Auto-dismiss (3-5 seconds)
- Click to dismiss
- Status dot indicators
- Max 4 toasts visible

#### **8. BigAlert** (`components/bigAlert.tsx`)
- Full-screen alerts for important messages
- Admin announcements
- Popup-style notifications

### 🎬 State Management

#### **Theme State** (`lib/theme.ts`)
```tsx
const [theme, toggleTheme] = useTheme()
// Persisted in localStorage
```

#### **Component Local State**
- Modal open/close states
- Form input states
- Loading/error states
- Authentication states

### 🔌 Hooks & Utilities

#### **useTheme()**
```tsx
const [theme, toggleTheme] = useTheme()
// Returns: ["dark" | "light", () => void]
```

#### **useToast()**
```tsx
const toast = useToast()
toast.success("Operation completed")
toast.error("An error occurred")
```

#### **useRouter()**
```tsx
import { useRouter } from "next/navigation"
const router = useRouter()
router.push("/dashboard")
```

#### **Custom Utilities**
- `copyToClipboard()` - URL/text copy
- `getSupabase()` - Supabase client
- `buildQrOptsFromStyle()` - QR styling
- `createLogoMask()` - Logo image processing

---

## 📋 Özet Tablosu

| Kategori | Detay |
|----------|-------|
| **Framework** | Next.js 13+ (App Router, SSR/CSR) |
| **Styling** | Tailwind CSS + Custom CSS |
| **Icons** | lucide-react |
| **Theme** | Dark/Light (localStorage) |
| **Colors** | Violet-Indigo primary, Multi-accent |
| **Typography** | Inter font, weight 300-900 |
| **Animations** | Fade, Scale, Blink, Spin (0.18-1.05s) |
| **Spacing** | 8px base unit system |
| **Radius** | 12px (cards), 16px (modals) |
| **Responsive** | Mobile-first, sm/md/lg breakpoints |
| **Components** | 8 major reusable components |
| **State** | React hooks + Supabase realtime |

---

## 🎯 Visual Hierarchy

### Başlıklar
- **H1**: `text-7xl font-black` (Landing page hero)
- **H2**: `text-4xl font-black` (Section titles)
- **H3**: `text-3xl font-bold` (Subsections)
- **H4**: `text-xl font-bold` (Card titles)

### Metin
- **Body**: `text-sm` dark-mode first
- **Small**: `text-xs` labels, metadata
- **Mono**: `font-mono` untuk codes/IDs

### Interactive Elements
- **Buttons**: `py-2.5 px-4 rounded-xl font-bold text-sm`
- **Inputs**: `py-3 px-4 rounded-xl`
- **Links**: Underline on hover, accent color

---

## 🔒 Accessibility Considerations

- ✅ ARIA labels on buttons
- ✅ Semantic HTML (button, label, input)
- ✅ Keyboard navigation support
- ✅ Focus states (focus-premium ring)
- ✅ Color contrast compliance
- ✅ Screen reader friendly
- ✅ Loading states clarity

---

**Son Güncelleme**: 2026-03-23
**Versiyon**: 1.0
