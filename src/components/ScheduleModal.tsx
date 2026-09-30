import React, { useState, useMemo } from 'react';
import { MaintenanceTicket } from '../types';
import { X, Calendar, CheckCircle, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useAcao } from '../hooks/useAcao';
import { ErroAcao } from './ErroAcao';
import { toIsoDate } from '../utils/helpers';
import { appointmentsForTechnicianOnDate, findConflictingAppointment } from '../domain/scheduling';

interface ScheduleModalProps {
  ticket?: MaintenanceTicket | null;
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  ticket,
  isOpen,
  onClose,
  defaultDate,
  defaultTime,
}) => {
  const { scheduleAppointment, technicians, appointments } = useApp();

  const [technicianId, setTechnicianId] = useState(
    ticket?.assignedTechnicianId || technicians[0]?.id || ''
  );

  // Default to today in YYYY-MM-DD
  const todayStr = useMemo(() => toIsoDate(), []);

  const [date, setDate] = useState(defaultDate || todayStr);
  const [startTime, setStartTime] = useState(defaultTime || '14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [clientName, setClientName] = useState(ticket?.tenantName ?? '');
  const [clientPhone, setClientPhone] = useState(ticket?.tenantPhone ?? '');
  const [address, setAddress] = useState(ticket?.address ?? '');
  const [serviceType, setServiceType] = useState(
    ticket ? `Execução do Reparo - ${ticket.environment} (${ticket.category})` : ''
  );
  const [notes, setNotes] = useState('');
  const [validacao, setValidacao] = useState<string | null>(null);

  // Antes do early return: hook não pode ser chamado condicionalmente.
  const { salvando, erro, executar } = useAcao();

  if (!isOpen) return null;

  const currentTech = technicians.find((t) => t.id === technicianId);

  // Aviso em tempo real, enquanto o operador escolhe horário. É conveniência de
  // interface: a garantia de verdade é a constraint EXCLUDE do banco, que recusa
  // a gravação mesmo se dois operadores agendarem no mesmo instante.
  const techDaySchedule = appointmentsForTechnicianOnDate(appointments, technicianId, date);

  const conflictingApt = findConflictingAppointment(appointments, {
    technicianId,
    date,
    startTime,
    endTime,
  });
  const hasConflict = Boolean(conflictingApt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidacao(null);

    if (!currentTech) {
      setValidacao('Selecione o técnico responsável pelo atendimento.');
      return;
    }

    if (startTime >= endTime) {
      setValidacao('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    // Cliente, endereço e imobiliária não são enviados: vêm do chamado, no
    // servidor. Mandá-los daqui permitiria agendar num endereço que não é o do
    // chamado — era o que o protótipo fazia.
    await executar(
      () =>
        scheduleAppointment({
          technicianId: currentTech.id,
          date,
          startTime,
          endTime,
          ticketId: ticket?.id,
          serviceType,
          notes,
        }),
      onClose
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Agendar Serviço de Manutenção</h3>
              <p className="text-xs text-slate-400">
                {ticket
                  ? `Vinculado ao chamado ${ticket.protocol}`
                  : 'Agendamento direto na Agenda'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Conflict Alert Warning */}
          {hasConflict && conflictingApt && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900">
                <span className="font-extrabold block">
                  ⚠️ Conflito de Horário para {currentTech?.name}!
                </span>
                Este prestador já possui a manutenção &quot;{conflictingApt.serviceType}&quot;
                agendada das{' '}
                <span className="font-bold">
                  {conflictingApt.startTime} às {conflictingApt.endTime}
                </span>{' '}
                no endereço {conflictingApt.address}.
                <div className="mt-1 font-semibold text-rose-700">
                  Por favor, selecione outro horário livre ou outro prestador disponível da equipe.
                </div>
              </div>
            </div>
          )}

          {validacao && !hasConflict && (
            <div
              role="alert"
              className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900"
            >
              {validacao}
            </div>
          )}

          <ErroAcao mensagem={erro} />

          {/* Technician Selector with Specialties & Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Prestador / Técnico Responsável *
            </label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold text-slate-800"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.team} ({t.specialties.join(', ')})
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Especialidades: {currentTech?.specialties.join(' • ') ?? '—'}</span>
              <span className="font-semibold text-indigo-600">
                ⭐ {currentTech?.rating ?? '—'} (Avaliações)
              </span>
            </div>
          </div>

          {/* Date and Time slots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data do Atendimento *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Horário Inicial *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Horário Término *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* Current schedule of technician for that day */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Agenda de {currentTech?.name ?? 'técnico'} no dia {date}:
            </span>
            {techDaySchedule.length === 0 ? (
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Nenhum outro serviço agendado para este técnico nesta data (Horário 100% livre!).
              </p>
            ) : (
              <div className="space-y-1">
                {techDaySchedule.map((apt) => (
                  <div
                    key={apt.id}
                    className="text-[11px] flex items-center justify-between bg-white px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {apt.startTime} - {apt.endTime}
                      </span>
                      <span className="truncate max-w-[200px]">{apt.serviceType}</span>
                    </div>
                    <span className="text-slate-500 truncate max-w-[150px]">{apt.address}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client & Address Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Inquilino / Contato
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Endereço do Atendimento
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo de Serviço / Escopo
            </label>
            <input
              type="text"
              required
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações para o Prestador
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hasConflict || salvando}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all ${
                hasConflict || salvando
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-indigo-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar Agendamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
