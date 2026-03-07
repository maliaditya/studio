"use client";

import React from 'react';
import { BrainCircuit } from 'lucide-react';

type LoadingScreenProps = {
  label?: string;
  subLabel?: string;
  className?: string;
};

export function LoadingScreen({
  label = 'Preparing your Dock experience...',
  subLabel = 'Syncing session and loading workspace.',
  className = 'min-h-screen',
}: LoadingScreenProps) {
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_40%),radial-gradient(circle_at_75%_10%,rgba(59,130,246,0.2),transparent_45%),linear-gradient(to_bottom,rgba(17,24,39,0.65),rgba(2,6,23,0.98))]" />

      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl animate-pulse" />

      <div className="relative z-10 flex min-h-[inherit] items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
              <BrainCircuit className="h-7 w-7 text-emerald-200 animate-pulse" />
            </div>
          </div>

          <div className="mb-6 text-center">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-emerald-200/90">Dock</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">{label}</h2>
            <p className="mt-1 text-sm text-slate-300/80">{subLabel}</p>
          </div>

          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-300/80 to-blue-300/80 animate-pulse" />
            </div>
            <div className="flex justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-bounce" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80 animate-bounce [animation-delay:120ms]" />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-300/80 animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
