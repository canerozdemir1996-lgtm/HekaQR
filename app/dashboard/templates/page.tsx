"use client";
import { useRouter } from "next/navigation";
import { TemplatesSection } from "@/components/TemplatesSection";
import { useTheme } from "@/lib/theme";

export default function TemplatesPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useTheme();

  return (
    <TemplatesSection
      isDark={theme === "dark"}
      onBack={() => router.push("/dashboard")}
      onToggleTheme={toggleTheme}
    />
  );
}
