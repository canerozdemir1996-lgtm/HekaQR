# 🎨 HekaQR Form Components 2026
## Modern Input Fields, Selects, Checkboxes with Glassmorphism

---

## 📝 Input Fields (Text, Email, Password, Number)

### Basic Input with Glassmorphism + Focus Glow

```tsx
// ✨ 2026 Modern Input Pattern
<input
  type="text"
  placeholder="Enter text..."
  className={`
    /* Glassmorphism base */
    w-full px-4 py-2.5 rounded-xl
    bg-white/5 backdrop-blur-md
    border border-white/10
    
    /* Typography */
    text-sm text-slate-100
    placeholder:text-slate-400
    
    /* Smooth transitions */
    transition-all duration-300
    
    /* Focus state - Enhanced glow */
    focus:bg-white/10 focus:border-violet-500/50
    focus:ring-2 focus:ring-violet-500/30
    focus:outline-none
    
    /* Hover state */
    hover:bg-white/8 hover:border-white/20
    
    /* Disabled state */
    disabled:opacity-50 disabled:cursor-not-allowed
  `}
/>
```

### Dark Mode vs Light Mode

```tsx
// Dark theme (default)
const darkInput = `
  bg-white/5 backdrop-blur-md border-white/10
  focus:bg-white/10 focus:border-violet-500/50
  focus:ring-violet-500/30
  text-slate-100 placeholder:text-slate-400
`;

// Light theme
const lightInput = `
  bg-slate-50 border-slate-200
  focus:bg-white focus:border-violet-500
  focus:ring-violet-500/20
  text-slate-900 placeholder:text-slate-400
`;
```

---

## 🎯 Input Variants

### 1. **Compact Input (xs)**
```tailwind
px-3 py-1.5 text-xs rounded-lg
```

### 2. **Standard Input (sm)**
```tailwind
px-3.5 py-2 text-sm rounded-xl
```

### 3. **Large Input (md)**
```tailwind
px-4 py-2.5 text-base rounded-xl
```

### 4. **XL Input (lg)**
```tailwind
px-5 py-3 text-lg rounded-2xl
```

---

## 🔐 Password Input with Visibility Toggle

```tsx
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  value = "",
  onChange,
  isDark = true,
}: {
  value?: string;
  onChange: (value: string) => void;
  isDark?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Şifrenizi girin..."
        className={`
          w-full px-4 py-2.5 rounded-xl pr-10
          ${isDark 
            ? "bg-white/5 border-white/10 focus:border-violet-500/50" 
            : "bg-slate-50 border-slate-200 focus:border-violet-500"
          }
          border backdrop-blur-md
          text-sm transition-all duration-300
          focus:ring-2 focus:ring-violet-500/30 focus:outline-none
          placeholder:text-slate-400 disabled:opacity-50
        `}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300
          ${isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"}
        `}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
```

---

## 📋 Textarea with Auto-grow

```tsx
import { useState } from 'react';

export function ModernTextarea({
  value = "",
  onChange,
  isDark = true,
  placeholder = "Enter message...",
}: {
  value?: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  placeholder?: string;
}) {
  const [rows, setRows] = useState(3);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    // Auto-grow
    const newRows = e.target.value.split('\n').length;
    setRows(Math.max(3, Math.min(8, newRows)));
  };

  return (
    <textarea
      value={value}
      onChange={handleChange}
      rows={rows}
      placeholder={placeholder}
      className={`
        w-full px-4 py-2.5 rounded-xl
        ${isDark 
          ? "bg-white/5 border-white/10 focus:border-violet-500/50" 
          : "bg-slate-50 border-slate-200 focus:border-violet-500"
        }
        border backdrop-blur-md
        text-sm resize-none transition-all duration-300
        focus:ring-2 focus:ring-violet-500/30 focus:outline-none
        placeholder:text-slate-400 disabled:opacity-50
      `}
    />
  );
}
```

---

## 🎛️ Select / Dropdown

```tsx
export function ModernSelect({
  value,
  onChange,
  options,
  isDark = true,
  placeholder = "Select option...",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  isDark?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-2.5 rounded-xl appearance-none pr-10
          ${isDark 
            ? "bg-white/5 border-white/10 focus:border-violet-500/50" 
            : "bg-slate-50 border-slate-200 focus:border-violet-500"
          }
          border backdrop-blur-md
          text-sm transition-all duration-300
          focus:ring-2 focus:ring-violet-500/30 focus:outline-none
          cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none
        ${isDark ? "text-slate-400" : "text-slate-600"}
      `}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}
```

---

## ☑️ Checkbox (Modern Style)

```tsx
export function ModernCheckbox({
  checked = false,
  onChange,
  label = "",
  isDark = true,
}: {
  checked?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  isDark?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className={`
        w-5 h-5 rounded-md border-2 transition-all duration-300
        flex items-center justify-center
        ${checked
          ? `bg-gradient-to-r from-violet-500 to-indigo-600 
             ${isDark ? "border-violet-400" : "border-violet-500"}
             shadow-glow-primary`
          : `${isDark ? "border-white/20" : "border-slate-300"}
             hover:border-violet-500/50`
        }
        group-active:scale-95
      `}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      {label && <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>{label}</span>}
    </label>
  );
}
```

---

## 🔘 Radio Button (Modern Style)

```tsx
export function ModernRadio({
  checked = false,
  onChange,
  label = "",
  isDark = true,
}: {
  checked?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  isDark?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className={`
        w-5 h-5 rounded-full border-2 transition-all duration-300
        flex items-center justify-center
        ${checked
          ? `border-violet-500 
             ${isDark ? "bg-white/10" : "bg-violet-50"}
             shadow-glow-primary`
          : `${isDark ? "border-white/20" : "border-slate-300"}
             hover:border-violet-500/50`
        }
        group-active:scale-95
      `}>
        {checked && (
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600" />
        )}
      </div>
      {label && <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>{label}</span>}
    </label>
  );
}
```

---

## 🎚️ Range Slider (Modern)

```tsx
export function ModernRange({
  value = 50,
  onChange,
  min = 0,
  max = 100,
  isDark = true,
}: {
  value?: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  isDark?: boolean;
}) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`
          w-full h-2 rounded-full appearance-none
          transition-all duration-300
          cursor-pointer
          bg-gradient-to-r from-violet-500 to-indigo-600
          // Webkit slider styling
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-violet-500/50
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:duration-300
          [&::-webkit-slider-thumb]:hover:scale-110
          
          // Firefox slider styling
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:shadow-lg
          [&::-moz-range-thumb]:shadow-violet-500/50
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        `}
      />
      <div className={`text-xs font-semibold mt-2
        ${isDark ? "text-slate-300" : "text-slate-700"}
      `}>
        {value}%
      </div>
    </div>
  );
}
```

---

## 📅 Date Input (Modern)

```tsx
export function ModernDateInput({
  value = "",
  onChange,
  isDark = true,
}: {
  value?: string;
  onChange: (value: string) => void;
  isDark?: boolean;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-full px-4 py-2.5 rounded-xl
        ${isDark 
          ? "bg-white/5 border-white/10 focus:border-violet-500/50" 
          : "bg-slate-50 border-slate-200 focus:border-violet-500"
        }
        border backdrop-blur-md
        text-sm transition-all duration-300
        focus:ring-2 focus:ring-violet-500/30 focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    />
  );
}
```

---

## 🎨 Form Input with Label + Error + Helper Text

```tsx
export function FormField({
  label,
  error,
  helperText,
  required = false,
  isDark = true,
  children, // Input component
}: {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  isDark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className={`text-sm font-semibold block transition-colors duration-300
          ${isDark ? "text-slate-200" : "text-slate-900"}
        `}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {children}
      </div>

      {error && (
        <div className={`text-xs flex items-center gap-1.5 animate-fade-in transition-all duration-300
          ${isDark 
            ? "text-red-300" 
            : "text-red-600"
          }`}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {helperText && !error && (
        <div className={`text-xs transition-colors duration-300
          ${isDark ? "text-slate-400" : "text-slate-500"}
        `}>
          {helperText}
        </div>
      )}
    </div>
  );
}
```

---

## 📝 Complete Form Example (Dark Theme)

```tsx
export function RegistrationForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation logic
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {/* Email Input */}
      <FormField label="Email Adresi" required error={errors.email}>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({...form, email: e.target.value})}
          placeholder="ornek@example.com"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-slate-100 placeholder:text-slate-400 transition-all duration-300 focus:ring-2 focus:ring-violet-500/30 focus:outline-none focus:bg-white/10"
        />
      </FormField>

      {/* Password Input */}
      <FormField label="Şifre" required error={errors.password}>
        <PasswordInput
          value={form.password}
          onChange={(val) => setForm({...form, password: val})}
          isDark={true}
        />
      </FormField>

      {/* Confirm Password */}
      <FormField label="Şifre Tekrar" required error={errors.confirmPassword}>
        <PasswordInput
          value={form.confirmPassword}
          onChange={(val) => setForm({...form, confirmPassword: val})}
          isDark={true}
        />
      </FormField>

      {/* Checkbox */}
      <FormField>
        <ModernCheckbox
          checked={form.agreeTerms}
          onChange={(val) => setForm({...form, agreeTerms: val})}
          label="Hizmet Şartları ve Gizlilik Politikasını  kabul ediyorum"
          isDark={true}
        />
      </FormField>

      {/* Submit Button */}
      <button
        type="submit"
        className={`w-full px-4 py-2.5 rounded-xl font-semibold transition-all duration-300
          bg-gradient-to-r from-violet-500 to-indigo-600
          hover:from-violet-400 hover:to-indigo-500
          text-white shadow-lg shadow-violet-500/50
          hover:shadow-violet-500/80 hover:scale-105
          active:scale-95 focus:ring-2 focus:ring-violet-500
        `}>
        Kayıt Ol
      </button>
    </form>
  );
}
```

---

## 🎯 Usage Guidelines

### Dark Mode (Recommended for 2026)
```tsx
// All inputs should default to dark theme
className="bg-white/5 backdrop-blur-md border-white/10 text-slate-100"
```

### Focus States (Critical for Accessibility)
```tsx
// Always include focus:ring and focus:outline-none
focus:ring-2 focus:ring-violet-500/30 focus:outline-none
focus:border-violet-500/50 focus:bg-white/10
```

### Disabled States
```tsx
// Always include opacity reduction
disabled:opacity-50 disabled:cursor-not-allowed
```

### Hover States
```tsx
// Smooth transitions on all interactive elements
hover:bg-white/8 hover:border-white/20 transition-all duration-300
```

---

## 📱 Mobile Responsive

All form fields automatically scale based on screen size:

```tsx
// Mobile-first approach
className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm"

// Height adjustments
className="h-9 sm:h-10"
```

---

**Last Updated**: March 2026  
**Status**: Production Ready ✨
