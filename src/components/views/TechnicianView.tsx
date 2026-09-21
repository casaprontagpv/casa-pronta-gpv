import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { MaintenanceTicket, Appointment } from '../../types';
import { MapPin, Phone, Navigation, CheckCircle2, FileText, Play } from 'lucide-react';
import { generateWhatsAppLink, getAppointmentStatusConfig } from '../../utils/helpers';
import { TechnicalReportModal } from '../TechnicalReportModal';
import { ServiceCompletionModal } from '../ServiceCompletionModal';

export const TechnicianView: React.FC = () => {
  const { tickets, userAppointments, currentUser, updateTicketStatus, updateAppointmentStatus } =
    useApp();

  const techName = currentUser?.name ?? 'Técnico';
  const techInitials = techName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const todayStr = new Date().toISOString().split('T')[0];

  // A rota do dia sai de userAppointments, que já está filtrado pelo technicianId do usuário
  // logado. Antes isto era `technicianName.includes('Carlos')` — qualquer outro técnico via
  // uma agenda vazia, e qualquer técnico chamado Carlos via a agenda alheia.
  const myAppointments = userAppointments
    .filter((a) => a.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const [selectedTicketForReport, setSelectedTicketForReport] = useState<MaintenanceTicket | null>(
    null
  );
  const [selectedTicketForCompletion, setSelectedTicketForCompletion] =
    useState<MaintenanceTicket | null>(null);

  const getTicketForAppointment = (apt: Appointment) => {
    if (!apt.ticketId) return null;
    return tickets.find((t) => t.id === apt.ticketId) || null;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Field Worker Header Card */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-1">
            Modo Campo / Celular • Casa Pronta
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">Olá, {techName}!</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {myAppointments.length} serviço(s) programado(s) para hoje
          </p>
        </div>

        <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-white font-bold text-lg">
          {techInitials}
        </div>
      </div>

      {/* Daily Route Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sua Rota de Atendimento de Hoje
          </h3>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {new Date(todayStr + 'T00:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>

        {myAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Tudo limpo por hoje!</h4>
            <p className="text-xs text-slate-500 mt-1">
              Nenhum outro serviço agendado para o seu perfil no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myAppointments.map((apt, idx) => {
              const ticket = getTicketForAppointment(apt);
              // 'em_atendimento' é o valor correto do enum AppointmentStatus.
              // O código anterior comparava com 'em_andamento', que não existe — o destaque
              // visual do card nunca ativava.
              const isStarted = apt.status === 'em_atendimento';
              const isCompleted = apt.status === 'concluido';
              const statusCfg = getAppointmentStatusConfig(apt.status);

              return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 transition-all ${
                    isStarted
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : isCompleted
                        ? 'border-emerald-200 opacity-80'
                        : 'border-slate-200'
                  }`}
                >
                  {/* Top Bar with Number & Time */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          {apt.startTime} às {apt.endTime}
                        </span>
                        {apt.protocol && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Protocolo {apt.protocol}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusCfg.color}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Scope & Address */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{apt.serviceType}</h4>
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{apt.address}</span>
                    </div>
                  </div>

                  {/* Client & Fast Action Buttons (Google Maps / Waze / WhatsApp) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Contato do Inquilino
                      </span>
                      <span className="font-bold text-slate-900">{apt.clientName}</span>
                      <span className="text-slate-500 block text-[11px]">{apt.clientPhone}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={generateWhatsAppLink(
                          apt.clientPhone,
                          `Olá ${apt.clientName}! Sou ${techName} da equipe de manutenção Casa Pronta. Estou a caminho do seu imóvel no endereço ${apt.address}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          apt.address
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Abrir Rota GPS</span>
                      </a>
                    </div>
                  </div>

                  {/* Operational Status Action Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <button
                      disabled={isStarted || isCompleted}
                      onClick={() => {
                        updateAppointmentStatus(apt.id, 'em_atendimento');
                        if (ticket) {
                          updateTicketStatus(
                            ticket.id,
                            'em_execucao',
                            `Técnico ${techName} informou que está no imóvel iniciando os trabalhos.`
                          );
                        }
                      }}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isStarted ? 'Atendimento Iniciado' : 'Iniciar Atendimento'}</span>
                    </button>

                    {ticket && (
                      <button
                        onClick={() => setSelectedTicketForReport(ticket)}
                        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        <span>
                          {ticket.technicalReport ? 'Ver Laudo Técnico' : 'Preencher Parecer'}
                        </span>
                      </button>
                    )}

                    {ticket && (
                      <button
                        onClick={() => setSelectedTicketForCompletion(ticket)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir c/ Fotos</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Field Modals */}
      {selectedTicketForReport && (
        <TechnicalReportModal
          ticket={selectedTicketForReport}
          isOpen={true}
          onClose={() => setSelectedTicketForReport(null)}
        />
      )}

      {selectedTicketForCompletion && (
        <ServiceCompletionModal
          ticket={selectedTicketForCompletion}
          isOpen={true}
          onClose={() => setSelectedTicketForCompletion(null)}
        />
      )}
    </div>
  );
};
