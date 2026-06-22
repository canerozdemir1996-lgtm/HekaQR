"use client";
import { TemplatesSection } from "@/components/TemplatesSection";
import { useTheme } from "@/lib/theme";

export default function TemplatesPage() {
  const [theme] = useTheme();

  return <TemplatesSection isDark={theme === "dark"} />;
}
