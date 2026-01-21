import React from 'react';
import { clsx } from 'clsx';
import { useLocation } from 'wouter';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function MobileLayout({ children, className, fullHeight = true }: MobileLayoutProps) {
  return (
    <div className={clsx(
      "w-full max-w-[440px] bg-background mx-auto relative shadow-2xl overflow-hidden flex flex-col",
      fullHeight ? "h-[100dvh]" : "min-h-[100dvh]",
      className
    )}>
      <div className="flex-1 flex flex-col relative z-0 overflow-y-auto no-scrollbar pb-24">
        {children}
      </div>
    </div>
  );
}
