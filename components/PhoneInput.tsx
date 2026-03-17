"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Country {
  code: string;   // +90
  iso: string;    // TR
  flag: string;   // 🇹🇷
  name: string;   // Türkiye
}

const COUNTRIES: Country[] = [
  { code: "+90",  iso: "TR", flag: "🇹🇷", name: "Türkiye" },
  { code: "+1",   iso: "US", flag: "🇺🇸", name: "ABD" },
  { code: "+1",   iso: "CA", flag: "🇨🇦", name: "Kanada" },
  { code: "+44",  iso: "GB", flag: "🇬🇧", name: "Birleşik Krallık" },
  { code: "+49",  iso: "DE", flag: "🇩🇪", name: "Almanya" },
  { code: "+33",  iso: "FR", flag: "🇫🇷", name: "Fransa" },
  { code: "+39",  iso: "IT", flag: "🇮🇹", name: "İtalya" },
  { code: "+34",  iso: "ES", flag: "🇪🇸", name: "İspanya" },
  { code: "+31",  iso: "NL", flag: "🇳🇱", name: "Hollanda" },
  { code: "+32",  iso: "BE", flag: "🇧🇪", name: "Belçika" },
  { code: "+41",  iso: "CH", flag: "🇨🇭", name: "İsviçre" },
  { code: "+43",  iso: "AT", flag: "🇦🇹", name: "Avusturya" },
  { code: "+48",  iso: "PL", flag: "🇵🇱", name: "Polonya" },
  { code: "+46",  iso: "SE", flag: "🇸🇪", name: "İsveç" },
  { code: "+47",  iso: "NO", flag: "🇳🇴", name: "Norveç" },
  { code: "+45",  iso: "DK", flag: "🇩🇰", name: "Danimarka" },
  { code: "+358", iso: "FI", flag: "🇫🇮", name: "Finlandiya" },
  { code: "+7",   iso: "RU", flag: "🇷🇺", name: "Rusya" },
  { code: "+380", iso: "UA", flag: "🇺🇦", name: "Ukrayna" },
  { code: "+30",  iso: "GR", flag: "🇬🇷", name: "Yunanistan" },
  { code: "+40",  iso: "RO", flag: "🇷🇴", name: "Romanya" },
  { code: "+36",  iso: "HU", flag: "🇭🇺", name: "Macaristan" },
  { code: "+420", iso: "CZ", flag: "🇨🇿", name: "Çekya" },
  { code: "+421", iso: "SK", flag: "🇸🇰", name: "Slovakya" },
  { code: "+20",  iso: "EG", flag: "🇪🇬", name: "Mısır" },
  { code: "+966", iso: "SA", flag: "🇸🇦", name: "Suudi Arabistan" },
  { code: "+971", iso: "AE", flag: "🇦🇪", name: "BAE" },
  { code: "+974", iso: "QA", flag: "🇶🇦", name: "Katar" },
  { code: "+965", iso: "KW", flag: "🇰🇼", name: "Kuveyt" },
  { code: "+973", iso: "BH", flag: "🇧🇭", name: "Bahreyn" },
  { code: "+968", iso: "OM", flag: "🇴🇲", name: "Umman" },
  { code: "+962", iso: "JO", flag: "🇯🇴", name: "Ürdün" },
  { code: "+961", iso: "LB", flag: "🇱🇧", name: "Lübnan" },
  { code: "+98",  iso: "IR", flag: "🇮🇷", name: "İran" },
  { code: "+92",  iso: "PK", flag: "🇵🇰", name: "Pakistan" },
  { code: "+91",  iso: "IN", flag: "🇮🇳", name: "Hindistan" },
  { code: "+86",  iso: "CN", flag: "🇨🇳", name: "Çin" },
  { code: "+81",  iso: "JP", flag: "🇯🇵", name: "Japonya" },
  { code: "+82",  iso: "KR", flag: "🇰🇷", name: "Güney Kore" },
  { code: "+65",  iso: "SG", flag: "🇸🇬", name: "Singapur" },
  { code: "+60",  iso: "MY", flag: "🇲🇾", name: "Malezya" },
  { code: "+62",  iso: "ID", flag: "🇮🇩", name: "Endonezya" },
  { code: "+66",  iso: "TH", flag: "🇹🇭", name: "Tayland" },
  { code: "+84",  iso: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "+63",  iso: "PH", flag: "🇵🇭", name: "Filipinler" },
  { code: "+880", iso: "BD", flag: "🇧🇩", name: "Bangladeş" },
  { code: "+55",  iso: "BR", flag: "🇧🇷", name: "Brezilya" },
  { code: "+52",  iso: "MX", flag: "🇲🇽", name: "Meksika" },
  { code: "+54",  iso: "AR", flag: "🇦🇷", name: "Arjantin" },
  { code: "+56",  iso: "CL", flag: "🇨🇱", name: "Şili" },
  { code: "+57",  iso: "CO", flag: "🇨🇴", name: "Kolombiya" },
  { code: "+27",  iso: "ZA", flag: "🇿🇦", name: "Güney Afrika" },
  { code: "+234", iso: "NG", flag: "🇳🇬", name: "Nijerya" },
  { code: "+254", iso: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "+212", iso: "MA", flag: "🇲🇦", name: "Fas" },
  { code: "+213", iso: "DZ", flag: "🇩🇿", name: "Cezayir" },
  { code: "+216", iso: "TN", flag: "🇹🇳", name: "Tunus" },
  { code: "+61",  iso: "AU", flag: "🇦🇺", name: "Avustralya" },
  { code: "+64",  iso: "NZ", flag: "🇳🇿", name: "Yeni Zelanda" },
  { code: "+994", iso: "AZ", flag: "🇦🇿", name: "Azerbaycan" },
  { code: "+995", iso: "GE", flag: "🇬🇪", name: "Gürcistan" },
  { code: "+374", iso: "AM", flag: "🇦🇲", name: "Ermenistan" },
  { code: "+996", iso: "KG", flag: "🇰🇬", name: "Kırgızistan" },
  { code: "+998", iso: "UZ", flag: "🇺🇿", name: "Özbekistan" },
  { code: "+7",   iso: "KZ", flag: "🇰🇿", name: "Kazakistan" },
];

interface Props {
  value: string;          // tam değer: "+90 5xx xxx xx xx"
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  dark?: boolean;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "5xx xxx xx xx", error, dark = true, className = "" }: Props) {
  // value'yu country code ve number olarak ayır
  const detectCountry = (val: string): Country => {
    for (const c of COUNTRIES) {
      if (val.startsWith(c.code + " ") || val.startsWith(c.code)) {
        return c;
      }
    }
    return COUNTRIES[0]; // default Türkiye
  };

  const [selected, setSelected] = useState<Country>(() => detectCountry(value));
  const [number, setNumber] = useState(() => {
    const c = detectCountry(value);
    return value.startsWith(c.code) ? value.slice(c.code.length).trim() : value;
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (c: Country) => {
    setSelected(c);
    setOpen(false);
    setSearch("");
    onChange(number ? `${c.code} ${number}` : "");
  };

  const handleNumberChange = (val: string) => {
    // sadece rakam, boşluk, tire
    const cleaned = val.replace(/[^\d\s\-]/g, "");
    setNumber(cleaned);
    onChange(cleaned ? `${selected.code} ${cleaned}` : "");
  };

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    c.iso.toLowerCase().includes(search.toLowerCase())
  );

  const dk = dark;
  const baseCls = dk
    ? "bg-white/[0.05] border-white/[0.10] text-slate-100"
    : "bg-slate-50 border-slate-200 text-slate-900";
  const focusCls = "focus-within:border-violet-500";
  const errCls = error ? "!border-red-500/60" : "";

  return (
    <div className={`relative flex border rounded-xl overflow-visible transition-all ${baseCls} ${focusCls} ${errCls} ${className}`} ref={dropRef}>
      {/* Flag + Code Button */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className={`flex items-center gap-1.5 px-3 py-2.5 border-r shrink-0 transition-colors ${
          dk ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-100"
        }`}
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className={`text-xs font-mono font-semibold ${dk ? "text-slate-300" : "text-slate-600"}`}>
          {selected.code}
        </span>
        <ChevronDown size={11} className={`${dk ? "text-slate-500" : "text-slate-400"} ${open ? "rotate-180" : ""} transition-transform`}/>
      </button>

      {/* Number Input */}
      <input
        type="tel"
        value={number}
        onChange={e => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 bg-transparent px-3 py-2.5 text-sm outline-none min-w-0 ${dk ? "text-slate-100 placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"}`}
      />

      {/* Dropdown */}
      {open && (
        <div className={`absolute left-0 top-full mt-1 w-64 rounded-xl border shadow-2xl z-50 overflow-hidden ${
          dk ? "bg-[#0f1627] border-white/10" : "bg-white border-slate-200"
        }`}>
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${dk ? "border-white/10" : "border-slate-100"}`}>
            <Search size={12} className={dk ? "text-slate-500" : "text-slate-400"}/>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ülke ara..."
              className={`flex-1 bg-transparent text-sm outline-none ${dk ? "text-slate-200 placeholder:text-slate-600" : "text-slate-800 placeholder:text-slate-400"}`}
            />
          </div>
          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((c, i) => (
              <button
                key={`${c.iso}-${i}`}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  selected.iso === c.iso
                    ? dk ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-600"
                    : dk ? "text-slate-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className={`text-xs font-mono shrink-0 ${dk ? "text-slate-500" : "text-slate-400"}`}>{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className={`px-3 py-4 text-xs text-center ${dk ? "text-slate-600" : "text-slate-400"}`}>Sonuç bulunamadı</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
