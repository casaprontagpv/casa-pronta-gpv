import React from 'react';
import { useApp } from '../../context/useApp';
import {
  PlusCircle,
  CheckCircle2,
  MapPin,
  ChevronRight,
  MessageSquare,
  Check,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { getStatusConfig, getPriorityConfig } from '../../utils/helpers';
import { TimelineViewer } from '../TimelineViewer';

interface TenantViewProps {
  onOpenNewTicket: () => void;
}

export const TenantView: React.FC<TenantViewProps> = ({ onOpenNewTicket }) => {
  const { userTickets, currentUser, setSelectedTicketId, updateAppointmentStatus } = useApp();

  const activeTickets = userTickets.filter(
    (t) => t.status !== 'concluido' && t.status !== 'cancelado'
  );
  const pastTickets = userTickets.filter((t) => t.status === 'concluido');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Property & Tenant Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
              Área do Inquilino
            </span>
            {currentUser?.propertyCode && (
              <span className="text-xs font-mono font-bold text-emerald-200 bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-700">
                Código: {currentUser.propertyCode}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Olá, {currentUser?.name || 'Inquilino'}!
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/90 mb-4">
            {/* Sem fallback: um endereço inventado aqui seria o endereço de
                outra pessoa, exibido a quem mora em outro lugar. */}
            {currentUser?.propertyAddress && (
              <span className="flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {currentUser.propertyAddress}
              </span>
            )}
            {currentUser?.agencyName && (
              <span className="flex items-center gap-1 text-emerald-200/80">
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                Imobiliária: {currentUser.agencyName}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mb-6">
            Acompanhe em tempo real cada etapa dos reparos do seu imóvel com total transparência.
            Seus dados são 100% isolados e você tem acesso direto à equipe responsável.
          </p>

          <button
            onClick={onOpenNewTicket}
            className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-950 hover:bg-emerald-50 active:bg-emerald-100 rounded-2xl text-xs font-black shadow-lg transition-all cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-emerald-700" />
            <span>ABRIR NOVO CHAMADO PARA MEU IMÓVEL</span>
          </button>
        </div>

        {/* Security badge at bottom corner */}
        <div className="mt-4 pt-3 border-t border-emerald-700/50 flex items-center gap-2 text-[11px] text-emerald-200/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Acesso restrito exclusivamente ao seu imóvel e aos seus chamados registrados.</span>
        </div>
      </div>

      {/* Active Tickets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Chamados em Andamento ({activeTickets.length})
            </h3>
            <p className="text-xs text-slate-500">Situação atual das manutenções no seu imóvel</p>
          </div>
        </div>

        {activeTickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">Tudo em ordem com seu imóvel!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nenhuma manutenção pendente no momento. Caso precise de qualquer reparo, clique no
              botão acima para abrir um chamado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeTickets.map((ticket) => {
              const statusCfg = getStatusConfig(ticket.status);
              const priorityCfg = getPriorityConfig(ticket.urgency);

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-black text-slate-900">
                          {ticket.protocol}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${statusCfg.bg}`}
                        >
                          {statusCfg.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityCfg.badge}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{ticket.address}</span>
                        <span className="text-slate-400">•</span>
                        <span>
                          {ticket.environment} ({ticket.category})
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Aberto em {ticket.createdAt}
                    </span>
                  </div>

                  {/* Plain Language Status Explanation ("O que está acontecendo agora?") */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                      Situação Atual:
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {ticket.status === 'chamado_aberto' &&
                        'Seu chamado foi recebido! A imobiliária está conferindo as fotos e direcionando para a equipe técnica.'}
                      {ticket.status === 'em_analise' &&
                        'A imobiliária está analisando a solicitação e autorizando a vistoria técnica presencial.'}
                      {ticket.status === 'aguardando_vistoria' &&
                        'Vistoria técnica presencial agendada/realizada. O laudo técnico e peças necessárias estão sendo preparados.'}
                      {ticket.status === 'orcamento_enviado' &&
                        'O orçamento do conserto já foi formulado e está sob análise de aprovação da imobiliária.'}
                      {ticket.status === 'orcamento_aprovado' &&
                        'Orçamento APROVADO! O agendamento da visita para execução já está liberado.'}
                      {ticket.status === 'servico_agendado' &&
                        `Seu atendimento foi agendado para ${new Date(ticket.appointment?.date + 'T00:00:00').toLocaleDateString('pt-BR')} às ${ticket.appointment?.startTime} com o técnico ${ticket.appointment?.technicianName}.`}
                      {ticket.status === 'em_execucao' &&
                        'Técnico no local executando os reparos necessários.'}
                    </p>
                  </div>

                  {/* Visual Step Timeline (Compact) */}
                  <TimelineViewer ticket={ticket} compact={true} />

                  {/* Actions & Alerts */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {ticket.appointment && !ticket.appointment.tenantConfirmed && (
                        <button
                          onClick={() => {
                            updateAppointmentStatus(ticket.appointment!.id, 'confirmado');
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar Presença</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ml-auto shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ver Linha do Tempo & Chat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History of Completed Tickets */}
      {pastTickets.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
            Histórico de Manutenções Concluídas ({pastTickets.length})
          </h3>

          <div className="space-y-2">
            {pastTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {ticket.protocol} — {ticket.environment} ({ticket.category})
                    </span>
                    <span className="text-slate-500 text-[11px]">{ticket.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {ticket.evaluation ? (
                    <span className="text-amber-600 font-bold flex items-center gap-0.5">
                      ⭐ {ticket.evaluation.rating}/5
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold underline">
                      Avaliar Atendimento
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
