import { BadgeCheck, CircleAlert } from "lucide-react";
import { planBadgePresentation, planTheme } from "@/lib/plan-ui";

type PlanStatusBadgeProps = {
  plan: string;
  status?: string | null;
  label?: string | null;
  className?: string;
};

export function PlanStatusBadge({ plan, status, label, className = "" }: PlanStatusBadgeProps) {
  const presentation = planBadgePresentation(plan, status, label);
  const theme = planTheme(presentation.planKey);
  const Icon = presentation.isAttention ? CircleAlert : BadgeCheck;
  const attentionClass = presentation.isAttention
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
    : `border-transparent ${theme.badge}`;

  return (
    <div
      role="status"
      aria-label={presentation.ariaLabel}
      title={presentation.ariaLabel}
      className={`dashboard-action border ${attentionClass} ${className}`}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{presentation.visibleLabel}</span>
    </div>
  );
}
