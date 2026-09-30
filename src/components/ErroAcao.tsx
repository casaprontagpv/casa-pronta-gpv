import React from 'react';
import { AlertCircle } from 'lucide-react';

/** Falha de uma ação que foi ao banco. Substitui os alert() do protótipo. */
export const ErroAcao: React.FC<{ mensagem: string | null }> = ({ mensagem }) =>
  mensagem ? (
    <div
      role="alert"
      className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-semibold text-rose-700"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{mensagem}</span>
    </div>
  ) : null;
