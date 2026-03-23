# HekaQR Component Inventory & Architecture

## 📦 Reusable Component Library

### 1. **ProfileMenu** (`components/ProfileMenu.tsx`)

#### Properties
```typescript
interface Props {
  email: string;
  role?: string;
  isDark: boolean;
  onLogout: () => Promise<void> | void;
  avatarUrl?: string | null;
}
```

#### Features
- ✅ Avatar display (uploaded or gravatar initial)
- ✅ Email display with role badge
- ✅ Password reset email sender
- ✅ Profile photo upload (drag-drop support)
- ✅ Image validation (1.2MB limit)
- ✅ Supabase storage integration
- ✅ Toast notifications for feedback
- ✅ Click-outside close handler

#### State Management
- `[open, setOpen]` - Dropdown visibility
- `[avatar, setAvatar]` - Avatar URL state
- `[savingAvatar, setSavingAvatar]` - Upload status
- `[sent, setSent]` - Reset email confirmation
- `[err, setErr]` - Error messages

#### Usage Example
```tsx
<ProfileMenu
  email={user.email}
  role={user.role}
  isDark={theme === "dark"}
  onLogout={handleLogout}
  avatarUrl={user.avatar_url}
/>
```

---

### 2. **CreateQRModal** (`components/CreateQRModal.tsx`)

#### Properties
```typescript
interface Props {
  onClose: () => void;
  onSuccess: (qr: QrCode) => void;
  editing?: QrCode | null;
  theme?: "dark" | "light";
}
```

#### QR Type Support
- `url` - Standard URL redirect
- `wifi` - WiFi network credentials
- `vcard` - Digital business card (5 templates)
- `sms` - SMS message
- `email` - Email composition
- `text` - Plain text
- `phone` - Phone call
- `location` - Geographic coordinates

#### Tabs
1. **Basic** - Title, slug, QR type selection, content
2. **Tracking** - UTM parameters, GA4, GTM, Webhooks
3. **Rules** - Device redirect, geo-redirect, schedule, A/B test

#### Advanced Features
- 🎨 Live QR preview
- 🎯 Custom slug generation
- 🔐 Password protection
- ⏰ Expiration date/scan limits
- 🔄 301/302 redirect selection
- 🧪 A/B testing with weighted distribution
- 📊 Meta Pixel tracking
- 🌍 Country-based routing (JSON)
- ⏱️ Schedule-based routing

#### vCard Templates
```typescript
VCARD_TPLS = [
  { id: "modern",    label: "Modern",   bg: "#0f172a" },
  { id: "classic",   label: "Klasik",   bg: "#ffffff" },
  { id: "minimal",   label: "Minimal",  bg: "#f9fafb" },
  { id: "dark",      label: "Dark Pro", bg: "#030712" },
  { id: "gradient",  label: "Gradient", bg: "linear-gradient(135deg,#6d28d9,#4f46e5)" },
]
```

#### State Management
- `[qrType, setQrType]` - Selected QR type
- `[title, setTitle]` - QR title
- `[slug, setSlug]` - Short slug (7 chars)
- Content fields (URL, WiFi SSID, vCard data, etc.)
- Advanced rules (device redirect, geo, schedule)
- `[loading, setLoading]` - Save operation status
- `[errors, setErrors]` - Validation errors

#### Data Validation
- Title required
- URL format validation
- Email validation
- Phone number validation
- JSON parsing for country rules

---

### 3. **BulkSection** (`components/BulkSection.tsx`)

#### Properties
```typescript
interface Props {
  onCreated: (qrs: QrCode[]) => void;
  isDark: boolean;
}
```

#### Features
- 📤 CSV file upload & parsing
- 🎯 Column auto-detection (Title, URL)
- ✅ Row-level validation
- 🎨 Template selection for batch
- 📊 Batch operation results reporting
- 🖼️ Batch PNG download

#### CSV Format
```csv
Title,URL
My Website,https://example.com
Product A,https://product.example.com
```

#### Parser Features
- Flexible column naming (Baslik, Başlık, Name, İsim)
- URL validation
- Quote-aware CSV parsing
- Error line reporting
- Duplicate prevention (in-memory)

#### State Management
- `[file, setFile]` - Uploaded CSV file
- `[rows, setRows]` - Parsed CSV rows
- `[template, setTemplate]` - Selected style
- `[loading, setLoading]` - Upload status
- `[result, setResult]` - Operation results
- `[errors, setErrors]` - Parsing errors

#### Template Picker Sub-component
- Dropdown with template list
- Style preview
- Selected indicator
- Custom list scroll

---

### 4. **TemplatesSection** (`components/TemplatesSection.tsx`)

#### QR Design Studio Features
- 🎨 **Dot Configuration**
  - Shapes: square, rounded, extra-rounded, dots, classy, classy-rounded
  - Colors: solid or gradient
  - Gradient types: linear, radial
  - Gradient angle: 0-360°

- 👁️ **Eye Configuration**
  - Frame types: square, extra-rounded, dot
  - Dot types: square, dot
  - Custom color option
  - Default color inheritance

- 🌈 **Color Settings**
  - Dot colors (solid or gradient)
  - Eye colors (custom or inherited)
  - Background colors
  - Transparency toggle

- 🏵️ **Logo Embedding**
  - Upload logo image
  - Shape: circle, square, rounded
  - Size slider (10-50%)
  - Canvas masking

- ⚙️ **Advanced Settings**
  - Error correction level (L, M, Q, H)
  - Margin adjustment
  - Live preview QR code

#### State Management
```typescript
interface Cfg {
  dotType:           DotType;
  dotColor:          string;
  useGradient:       boolean;
  gradientType:      "linear" | "radial";
  gradientAngle:     number;
  color1:            string;
  color2:            string;
  eyeFrameType:      EyeFrameType;
  eyeDotType:        EyeDotType;
  eyeColor:          string;
  useCustomEyeColor: boolean;
  bgColor:           string;
  bgTransparent:     boolean;
  margin:            number;
  ecLevel:           "L" | "M" | "Q" | "H";
  logoShape:         LogoShape;
  logoSize:          number;
  previewUrl:        string;
}
```

#### Live Components
- `LiveQR` - Real-time preview (220px or custom)
- `MiniQR` - Thumbnail preview
- Color picker modals
- Slider inputs for numeric values

---

### 5. **OnboardingTour** (`components/OnboardingTour.tsx`)

#### Features
- 📍 Step-by-step feature introduction
- 🎯 Interactive tooltips
- ✅ Progress tracking
- ⏭️ Skip/next navigation
- 💾 Completion persistence

#### User Targeting
- First-time users detection
- Conditional rendering based on user state
- localStorage-based completion tracking

---

### 6. **PhoneInput** (`components/PhoneInput.tsx`)

#### Properties
```typescript
interface Props {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDark?: boolean;
}
```

#### Features
- 🌍 International phone format
- 🏁 Country code selection
- ✅ Number validation
- 📱 Mobile-friendly input
- 🎯 Auto-format on blur

#### Integration
- Used in vCard creation
- Supabase phone_number field mapping
- Multi-phone support (phone, phone2)

---

### 7. **Toast System** (`components/toast.tsx`)

#### Context-based Implementation
```typescript
type ToastType = "success" | "error" | "info"

type ToastApi = {
  show: (t: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}
```

#### Features
- 🎨 3 notification types (success, error, info)
- ⏱️ Auto-dismiss timers
- 📍 Max 4 visible toasts
- 🎯 Click to dismiss
- 🎭 Dark/Light mode colors
- 🔔 Status indicators

#### Color Schemes
- **Success**: `border-emerald-500/20 bg-emerald-500/10 text-emerald-200`
- **Error**: `border-red-500/20 bg-red-500/10 text-red-200`
- **Info**: `border-white/10 bg-white/[0.06] text-slate-200`

#### Auto-dismiss Timers
- Success: 3.2s
- Error: 5.2s
- Info: 3.5s

#### Usage Pattern
```tsx
const toast = useToast()
toast.success("Operation successful", "Title")
toast.error("An error occurred")
toast.info("Informational message")
```

---

### 8. **BigAlert** (`components/bigAlert.tsx`)

#### Features
- 📢 Full-screen attention-grabbing alerts
- 🔴 Critical system messages
- 👤 Admin-to-user communication
- 🎯 Popup-style dismissible
- ⚡ High z-index (prevents overlooking)

#### Integration
- Used alongside Toast for critical messages
- Part of admin messaging system
- Realtime message delivery

---

## 🎯 Page-Level Components

### Dashboard (`app/dashboard/page.tsx`)

#### Major Sections
1. **Header Bar**
   - Search bar
   - Create QR button
   - Theme switcher
   - Profile menu
   - Notifications

2. **QR List Section**
   - Table/Grid view toggle
   - Infinite scroll or pagination
   - QR thumbnail preview
   - Quick actions (copy, stats, delete)
   - Row selection (bulk delete)

3. **Analytics Drawer**
   - Scan statistics
   - Daily trend chart
   - Device breakdown
   - Recent scan logs
   - Unique visitor count

4. **Modals**
   - CreateQRModal
   - Analytics details
   - Confirmation dialogs

#### State Management
```typescript
const [qrcodes, setQrcodes] = useState<QrCode[]>([])
const [stats, setStats] = useState<DashboardStats | null>(null)
const [selectedQrs, setSelectedQrs] = useState<Set<string>>(new Set())
const [search, setSearch] = useState("")
const [view, setView] = useState<"grid" | "list">("grid")
const [theme, toggleTheme] = useTheme()
```

#### Key Features
- 🔍 Real-time search
- 📊 Live analytics
- 🎯 Bulk operations
- 🔐 Admin guard
- 📱 Mobile responsive

---

### Admin Panel (`app/admin/page.tsx`)

#### Sections
1. **Overview Tab**
   - System statistics
   - User count
   - Total QR codes
   - Total scans
   - Active QR codes

2. **Users Tab**
   - User list with search
   - Create user modal
   - Edit/Delete user actions
   - Role management (owner, admin, user)
   - User statistics

3. **Analytics Tab**
   - Global scan trends
   - Top QR codes
   - Device breakdown
   - Country breakdown
   - Daily trends

4. **Messages Tab**
   - Send admin messages
   - Message history
   - Popup vs inline selection

#### User Modal Features
- Email input (disabled on edit)
- Full name input
- Password input (new only)
- Role selection (limited by actor role)
- Validation & error handling

#### State Management
```typescript
const [users, setUsers] = useState<AppUser[]>([])
const [stats, setStats] = useState<AdminStats | null>(null)
const [qrList, setQrList] = useState<AdminQrItem[]>([])
const [editUser, setEditUser] = useState<AppUser | null | "new">(null)
const [tab, setTab] = useState<AdminTabId>("overview")
const [search, setSearch] = useState("")
```

---

### vCard Builder (`app/dashboard/vcard-builder/page.tsx`)

#### Builder Features
- 📝 Text inputs (name, title, company)
- 📞 Phone numbers (primary + secondary)
- 📧 Email addresses (primary + secondary)
- 🌐 Website URL
- 📍 Address fields (street, city, country)
- 🎨 5 template styles
- 🖼️ Avatar & cover image upload
- 🔗 Social media links
- 👁️ Live preview

#### Data Structure
```typescript
type VCardData = {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  department: string;
  bio: string;
  phone: string;
  phone2: string;
  email: string;
  email2: string;
  website: string;
  address: string;
  city: string;
  country: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  youtube: string;
  github: string;
  whatsapp: string;
  template: "modern" | "classic" | "minimal" | "dark" | "gradient";
  accentColor: string;
  coverColor: string;
  avatar: string;
  coverImage: string;
}
```

#### Preview Themes
- **Modern**: Dark card with light text
- **Classic**: White card with dark text
- **Minimal**: Light gray with minimal styling
- **Dark**: Ultra-dark with light text
- **Gradient**: Background gradient with glass effect

---

## 🏗️ Component Composition Patterns

### Modal Pattern
```tsx
// Overlay + Backdrop + Content
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadein p-4">
  <div className="w-full max-w-md rounded-2xl border shadow-2xl p-6 animate-scalein">
    {/* Modal content */}
  </div>
</div>
```

### Drawer Pattern
```tsx
// Side panel with animation
<div className="fixed inset-0 z-50 flex justify-end">
  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
  <div className="relative z-10 max-w-[380px] h-full overflow-y-auto animate-fadein">
    {/* Drawer content */}
  </div>
</div>
```

### Dropdown Pattern
```tsx
// Portal-based positioning
{open && createPortal(
  <>
    <div className="fixed inset-0 z-[9998]" onClick={onClose} />
    <div className="fixed z-[9999] rounded-2xl border shadow-2xl" style={{ top, left }}>
      {/* Items */}
    </div>
  </>,
  document.body
)}
```

---

## 🔄 State Management Patterns

### Context API with Hooks
```typescript
// useTheme - Theme persistence
const [theme, toggleTheme] = useTheme()

// useToast - Global notifications
const toast = useToast()
toast.success("Message")

// useBigAlert - Critical alerts
const bigAlert = useBigAlert()
bigAlert.warn("Critical message")
```

### Component State
```typescript
// Local state for forms
const [formData, setFormData] = useState(initialData)
const [loading, setLoading] = useState(false)
const [error, setError] = useState("")

// Form submission
const handleSubmit = async (e) => {
  setError("")
  setLoading(true)
  try {
    await api.save(formData)
    setLoading(false)
  } catch (err) {
    setError(err.message)
    setLoading(false)
  }
}
```

### Supabase Real-time
```typescript
// Subscribe to changes
const subscription = supabase
  .channel("qr_codes")
  .on("postgres_changes", { event: "*", schema: "public", table: "qr_codes" }, payload => {
    handleChange(payload)
  })
  .subscribe()
```

---

## 📊 Data Flow Diagram

```
User Input (Form/Click)
        ↓
Component State Update
        ↓
Validation
        ↓
Supabase API Call
        ↓
Toast/Alert Feedback
        ↓
Refresh Data / Update UI
```

---

## ♿ Accessibility Features

### Semantic HTML
- `<button>` instead of `<div>` for actions
- `<label>` for form inputs
- `<input type="...">` for proper input types
- `<form>` wrappers for forms

### ARIA Labels
```tsx
<button aria-label="Close modal" onClick={onClose}>
  <X />
</button>
```

### Keyboard Navigation
- Tab through form fields
- Enter to submit forms
- Escape to close modals
- Arrow keys for dropdowns

### Focus Management
- Focus rings on interactive elements
- Focus trap in modals
- Focus restoration on close

### Color Contrast
- ✅ WCAG AA compliance
- Text on surfaces
- Border visibility
- Icon color distinctions

---

## 🎯 Performance Considerations

### Code Splitting
- Lazy load modals
- Dynamic `qr-code-styling` import
- Image optimization with Next.js Image

### Memoization
- `useMemo` for expensive calculations
- `useCallback` for event handlers
- `React.memo` for component wrapping

### Virtualization
- Infinite scroll for large QR lists
- Window-based rendering

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-23  
**Total Components**: 8 major reusable + 15 page-level components
