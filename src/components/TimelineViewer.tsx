import React from 'react';
import { MaintenanceTicket, TicketStatus } from '../types';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface TimelineViewerProps {
  ticket: MaintenanceTicket;
  compact?: boolean;
}

const ORDERED_STEPS: { key: TicketStatus; label: string; shortLabel: string }[] = [
  { key: 'chamado_aberto', label: 'Chamado Aberto', shortLabel: 'Aberto' },
  { key: 'em_analise', label: 'Em Análise (Imob.)', shortLabel: 'Análise' },
  { key: 'aguardando_vistoria', label: 'Vistoria / Parecer', shortLabel: 'Vistoria' },
  { key: 'orcamento_enviado', label: 'Orçamento Enviado', shortLabel: 'Orçamento' },
  { key: 'orcamento_aprovado', label: 'Orçamento Aprovado', shortLabel: 'Aprovado' },
  { key: 'servico_agendado', label: 'Serviço Agendado', shortLabel: 'Agendado' },
  { key: 'em_execucao', label: 'Em Execução', shortLabel: 'Execução' },
  { key: 'concluido', label: 'Concluído', shortLabel: 'Concluído' },
];

export const TimelineViewer: React.FC<TimelineViewerProps> = ({ ticket, compact = false }) => {
  const isRejected = ticket.status === 'orcamento_reprovado';
  const isPending = ticket.status === 'pendente';

  // Determine which step in ORDERED_STEPS is the current active step index
  const getCurrentStepIndex = () => {
    if (ticket.status === 'concluido') return 7;
    if (ticket.status === 'em_execucao') return 6;
    if (ticket.status === 'servico_agendado') return 5;
    if (ticket.status === 'orcamento_aprovado') return 4;
    if (ticket.status === 'orcamento_enviado' || ticket.status === 'aguardando_aprovacao') return 3;
    if (ticket.status === 'aguardando_vistoria') return 2;
    if (ticket.status === 'em_analise') return 1;
    if (ticket.status === 'chamado_aberto') return 0;
    return 0;
  };

  const currentStepIdx = getCurrentStepIndex();

  if (compact) {
    return (
      <div className="w-full">
        {/* Compact Progress Bar */}
        <div className="flex items-center justify-between gap-1 mb-1.5 overflow-x-auto pb-1">
          {ORDERED_STEPS.map((step, idx) => {
            const isCompleted =
              idx < currentStepIdx || (idx === currentStepIdx && ticket.status === 'concluido');
            const isCurrent = idx === currentStepIdx && ticket.status !== 'concluido';

            return (
              <div key={step.key} className="flex-1 min-w-[50px] flex flex-col items-center">
                <div
                  className={`w-full h-1.5 rounded-full transition-all ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isCurrent
                        ? isRejected
                          ? 'bg-rose-500'
                          : 'bg-indigo-600 animate-pulse'
                        : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 text-center truncate w-full ${
                    isCurrent
                      ? 'font-bold text-indigo-700'
                      : isCompleted
                        ? 'text-slate-700 font-medium'
                        : 'text-slate-400'
                  }`}
                >
                  {step.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Linha do Tempo Transparente
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento em tempo real de cada etapa e responsável
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Protocolo</span>
          <p className="text-sm font-extrabold text-indigo-900">{ticket.protocol}</p>
        </div>
      </div>

      {/* Horizontal step indicators for wide screens */}
      <div className="hidden lg:flex items-center justify-between mb-8 px-2 relative">
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
        {ORDERED_STEPS.map((step, idx) => {
          const isCompleted =
            idx < currentStepIdx || (idx === currentStepIdx && ticket.status === 'concluido');
          const isCurrent = idx === currentStepIdx && ticket.status !== 'concluido';

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? isRejected
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                        : 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`text-xs mt-2 text-center whitespace-nowrap ${
                  isCurrent
                    ? 'font-bold text-indigo-900'
                    : isCompleted
                      ? 'font-semibold text-slate-800'
                      : 'text-slate-400 font-normal'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Special status warning badges */}
      {isRejected && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            <span className="font-bold">Orçamento Reprovado pela Imobiliária: </span>
            {ticket.quote?.rejectionReason ||
              'Necessita reavaliação de custos ou materiais pela empresa prestadora.'}
          </div>
        </div>
      )}

      {isPending && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <span className="font-bold">Chamado com Pendência Técnica: </span>
            Aguardando chegada de material especializado ou autorização de retorno.
          </div>
        </div>
      )}

      {/* Detailed Chronological Event Feed */}
      <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
        {ticket.timeline.map((event, idx) => {
          const isLatest = idx === ticket.timeline.length - 1;
          return (
            <div key={event.id} className="relative flex items-start gap-3 pl-8 group">
              <div
                className={`absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all ${
                  isLatest
                    ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-600'
                    : 'border-slate-400 group-hover:border-slate-600'
                }`}
              />
              <div className="flex-1 bg-slate-50 hover:bg-slate-100/80 transition-colors p-3.5 rounded-lg border border-slate-200/80">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-slate-900">{event.title}</span>
                  <span className="text-[11px] text-slate-500 font-medium">{event.timestamp}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{event.description}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">{event.authorName}</span>
                  <span>•</span>
                  <span className="capitalize px-1.5 py-0.5 rounded-xs bg-white border border-slate-200 text-[10px] text-slate-600">
                    {event.authorRole}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
