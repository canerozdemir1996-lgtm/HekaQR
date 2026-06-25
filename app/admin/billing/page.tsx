"use client";

import BillingHealthPanel from "@/components/dashboard/BillingHealthPanel";

export default function AdminBillingPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Billing Health</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Lemon Squeezy store, variant ve webhook bağlantılarının iç teşhis görünümü. Bu sayfa sadece admin/owner içindir.
        </p>
      </div>
      <BillingHealthPanel />
    </div>
  );
}
