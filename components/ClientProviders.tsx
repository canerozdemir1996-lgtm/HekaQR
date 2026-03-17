"use client";

import React from "react";
import { ToastProvider } from "@/components/toast";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}

