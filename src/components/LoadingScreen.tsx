import React from 'react';
import { Wrench } from 'lucide-react';

interface LoadingScreenProps {
  label?: string;
}

/** Tela de espera enquanto a sessão é restaurada ou um portal é carregado. */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ label = 'Carregando…' }) => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4"
  >
    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
      <Wrench className="w-6 h-6 text-indigo-400 animate-pulse" />
    </div>
    <span className="text-xs font-bold text-slate-500 tracking-wide">{label}</span>
  </div>
);
