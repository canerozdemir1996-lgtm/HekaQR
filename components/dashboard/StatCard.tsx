"use client";

import React from "react";
import { CardBody, CardContainer, CardItem } from "@/lib/3d-card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: "positive" | "negative";
  color?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  change,
  changeType = "positive",
  color = "#a855f7", // default to violet
  className,
}: StatCardProps) {
  return (
    <CardContainer containerClassName="w-full h-full" className="w-full h-full">
      <CardBody
        className={cn(
          "relative group/card w-full h-full rounded-2xl p-6 flex flex-col justify-between",
          "bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-white/10",
          "shadow-md hover:shadow-xl dark:shadow-black/20 dark:hover:shadow-violet-500/10 transition-all duration-300",
          className
        )}
      >
        {/* Parlama Efekti */}
        <div
          className="absolute top-0 left-0 w-full h-full rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color}1A, transparent 70%)`,
          }}
        />

        {/* Kart İçeriği */}
        <div className="relative z-10">
          <CardItem translateZ="50" className="flex justify-between items-start">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
              {icon}
            </div>
          </CardItem>

          <CardItem translateZ="80" className="mt-4">
            <p className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">
              {value}
            </p>
            {change && (
              <div className={`mt-2 flex items-center text-xs font-semibold ${changeType === 'positive' ? 'text-emerald-500' : 'text-red-500'}`}>
                {changeType === 'positive' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {change}
              </div>
            )}
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  );
}
