import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/useApp';
import {
  Layers,
  Calendar as CalendarIcon,
  Users,
  LayoutDashboard,
  Search,
  Plus,
  MapPin,
  Navigation,
} from 'lucide-react';
import { getStatusConfig, getPriorityConfig, formatCurrency, toIsoDate } from '../../utils/helpers';
import { ScheduleModal } from '../ScheduleModal';

export const CompanyView: React.FC = () => {
  const { tickets, appointments, technicians, setSelectedTicketId } = useApp();

  const [activeTab, setActiveTab] = useState<'chamados' | 'agenda' | 'equipe' | 'dashboard'>(
    'dashboard'
  );

  // Modal for new appointment
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);

  // Filters for Chamados
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('todos');
  const [ticketTechFilter, setTicketTechFilter] = useState('todos');

  // Agenda view state
  const [agendaMode, setAgendaMode] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [agendaSelectedTech, setAgendaSelectedTech] = useState<string>('todos');

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => toIsoDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Tickets filtered
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.protocol.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.address.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.tenantName.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(ticketSearch.toLowerCase());

      const matchStatus = ticketStatusFilter === 'todos' || t.status === ticketStatusFilter;
      const matchTech = ticketTechFilter === 'todos' || t.assignedTechnicianId === ticketTechFilter;

      return matchSearch && matchStatus && matchTech;
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketTechFilter]);

  // Appointments filtered for agenda
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchTech = agendaSelectedTech === 'todos' || a.technicianId === agendaSelectedTech;
      const matchDate = agendaMode === 'dia' ? a.date === selectedDate : true;
      return matchTech && matchDate;
    });
  }, [appointments, agendaSelectedTech, agendaMode, selectedDate]);

  // Paradas do dia, em ordem cronológica.
  const todayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, todayStr]);

  // Técnicos efetivamente em campo agora, contados pelo status do atendimento.
  // Antes isto era o literal "3", que continuava afirmando três técnicos em
  // trânsito num sistema sem técnico nenhum cadastrado.
  const tecnicosEmCampo = useMemo(
    () =>
      new Set(
        todayAppointments
          .filter((a) => a.status === 'em_deslocamento' || a.status === 'em_atendimento')
          .map((a) => a.technicianId)
      ).size,
    [todayAppointments]
  );

  // Metrics
  const todayCount = todayAppointments.length;
  const inProgressCount = tickets.filter((t) => t.status === 'em_execucao').length;
  const quotePendingCount = tickets.filter((t) => t.status === 'orcamento_enviado').length;
  const waitingVistoriaCount = tickets.filter((t) => t.status === 'aguardando_vistoria').length;
  const scheduledCount = tickets.filter((t) => t.status === 'servico_agendado').length;

  const totalQuoted = tickets.reduce((acc, t) => {
    return acc + (t.quote?.totalCost || 0);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Central de Operações Header */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Central de Operações • Casa Pronta Manutenção
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Gestão Operacional de Serviços & Equipes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordenação de chamados, designação de técnicos, vistorias e orçamentos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowNewScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento na Agenda</span>
          </button>
        </div>
      </div>

      {/* 4 Main Operational Areas Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>1. Dashboard & Rota do Dia</span>
        </button>

        <button
          onClick={() => setActiveTab('chamados')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'chamados'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Gestão de Chamados ({tickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agenda')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'agenda'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>3. Agenda & Conflitos ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('equipe')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
            activeTab === 'equipe'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Equipes & Técnicos ({technicians.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. DASHBOARD & MAPA OPERACIONAL                          */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Operational Status Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Agendados Hoje
              </span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">{todayCount}</span>
              <span className="text-[10px] text-slate-400">Na rota do dia</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Em Execução
              </span>
              <span className="text-2xl font-black text-cyan-600 mt-1 block">
                {inProgressCount}
              </span>
              <span className="text-[10px] text-slate-400">Técnicos no local</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Aguard. Orçamento
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {waitingVistoriaCount}
              </span>
              <span className="text-[10px] text-slate-400">Pós-vistoria</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Aguard. Aprovação
              </span>
              <span className="text-2xl font-black text-purple-600 mt-1 block">
                {quotePendingCount}
              </span>
              <span className="text-[10px] text-slate-400">Com a imobiliária</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Serviços Marcados
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {scheduledCount}
              </span>
              <span className="text-[10px] text-slate-400">Próximos dias</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              {/* "Faturamento" prometia receita. Isto é a soma de TODO orçamento
                  emitido — aprovado ou não, executado ou não. O rótulo precisa
                  dizer o que o número é. */}
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                Valor Orçado
              </span>
              <span className="text-xl font-black text-emerald-600 mt-1 block truncate">
                {formatCurrency(totalQuoted)}
              </span>
              <span className="text-[10px] text-slate-400">
                Todos os orçamentos emitidos, aprovados ou não
              </span>
            </div>
          </div>

          {/* Rota do dia */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Mapa Operacional de Rota do Dia ({todayAppointments.length} Paradas)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Ordem cronológica dos atendimentos de campo das equipes
                </p>
              </div>

              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                Data: {new Date(todayStr + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Simulated Visual City Route Canvas */}
              <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden min-h-[340px] flex flex-col justify-between border border-slate-800">
                {/* Visual City Grid Background */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[11px] font-mono tracking-widest text-indigo-400 uppercase bg-slate-900/80 px-2.5 py-1 rounded-md border border-indigo-900/50">
                    Sequência de atendimentos
                  </span>
                  {tecnicosEmCampo > 0 ? (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {tecnicosEmCampo}{' '}
                      {tecnicosEmCampo === 1 ? 'técnico em campo' : 'técnicos em campo'}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Nenhum técnico em campo agora
                    </span>
                  )}
                </div>

                {/* Paradas do dia */}
                {todayAppointments.length === 0 && (
                  <div className="relative z-10 py-10 text-center text-sm text-slate-500">
                    Nenhum atendimento agendado para hoje.
                  </div>
                )}
                <div className="relative z-10 py-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  {todayAppointments.map((apt, idx) => (
                    <div
                      key={apt.id}
                      className="bg-slate-900/90 border border-indigo-500/40 hover:border-indigo-400 rounded-xl p-3 backdrop-blur-xs transition-all cursor-pointer group shadow-lg"
                      onClick={() => {
                        if (apt.ticketId) setSelectedTicketId(apt.ticketId);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {apt.startTime}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white block truncate group-hover:text-indigo-300">
                        {apt.serviceType}
                      </span>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{apt.address}</p>
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <span>👤 {apt.technicianName}</span>
                        <span className="text-emerald-400">{apt.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                  <span>
                    {todayAppointments.length}{' '}
                    {todayAppointments.length === 1 ? 'parada' : 'paradas'} hoje
                  </span>
                  <span>Clique numa parada para abrir o chamado</span>
                </div>
              </div>

              {/* Day's Chronological Stop List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Sequência Cronológica
                </h4>
                <div className="space-y-2.5">
                  {todayAppointments.map((apt, idx) => (
                    <div
                      key={apt.id}
                      onClick={() => {
                        if (apt.ticketId) setSelectedTicketId(apt.ticketId);
                      }}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200 transition-all cursor-pointer text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">
                            {apt.startTime} - {apt.endTime}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {apt.teamName}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">{apt.serviceType}</p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{apt.address}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                        <span>Técnico: {apt.technicianName}</span>
                        <span className="font-bold text-slate-800">
                          Inquilino: {apt.clientName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. GESTÃO OPERACIONAL DE CHAMADOS                        */}
      {/* ======================================================== */}
      {activeTab === 'chamados' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por protocolo, inquilino, endereço..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                <option value="todos">Todos os Status</option>
                <option value="chamado_aberto">Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="aguardando_vistoria">Aguardando Vistoria</option>
                <option value="orcamento_enviado">Orçamento Enviado</option>
                <option value="orcamento_aprovado">Orçamento Aprovado</option>
                <option value="servico_agendado">Agendado</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluido">Concluído</option>
              </select>

              <select
                value={ticketTechFilter}
                onChange={(e) => setTicketTechFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                <option value="todos">Todos os Técnicos</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards List */}
          {filteredTickets.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-sm font-semibold text-slate-600">
                {tickets.length === 0
                  ? 'Nenhum chamado aberto ainda.'
                  : 'Nenhum chamado para os filtros selecionados.'}
              </p>
              {tickets.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Os chamados aparecem aqui assim que um inquilino ou uma imobiliária abrir o
                  primeiro.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map((t) => {
              const statusCfg = getStatusConfig(t.status);
              const priorityCfg = getPriorityConfig(t.urgency);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{t.protocol}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusCfg.bg}`}
                        >
                          {statusCfg.label}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold border ${priorityCfg.badge}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Imobiliária: {t.assignedAgencyName || '—'}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">{t.createdAt}</span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t.address} ({t.environment})
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{t.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-slate-500 text-[11px]">
                      Técnico:{' '}
                      <span className="font-semibold text-slate-800">
                        {t.assignedTechnicianName || 'Não designado'}
                      </span>
                    </div>

                    {t.quote ? (
                      <span className="font-extrabold text-emerald-600">
                        {formatCurrency(t.quote.totalCost)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Sem orçamento</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. AGENDA CENTRAL & DETECÇÃO DE CONFLITOS                */}
      {/* ======================================================== */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Agenda Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAgendaMode('dia')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                  agendaMode === 'dia'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Visão Dia
              </button>
              <button
                onClick={() => setAgendaMode('semana')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                  agendaMode === 'semana'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Visão Semana
              </button>
              <button
                onClick={() => setAgendaMode('mes')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                  agendaMode === 'mes'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Visão Mês
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">Data:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
              />

              <select
                value={agendaSelectedTech}
                onChange={(e) => setAgendaSelectedTech(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todos os Técnicos</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.team})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowNewScheduleModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar</span>
              </button>
            </div>
          </div>

          {/* Agenda Grid (Hours 08:00 to 18:00) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                Grade de Horários •{' '}
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {filteredAppointments.length} agendamento(s) programado(s)
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                '08:00',
                '09:00',
                '10:00',
                '11:00',
                '12:00',
                '13:00',
                '14:00',
                '15:00',
                '16:00',
                '17:00',
              ].map((hour) => {
                const hourApts = filteredAppointments.filter((a) => {
                  return a.startTime.slice(0, 2) === hour.slice(0, 2);
                });

                return (
                  <div key={hour} className="py-2.5 flex items-start gap-4">
                    <div className="w-14 shrink-0 text-xs font-mono font-bold text-slate-400 pt-1">
                      {hour}
                    </div>

                    <div className="flex-1 min-h-[44px] flex flex-wrap gap-2 items-center">
                      {hourApts.length === 0 ? (
                        <span className="text-[11px] text-slate-300 italic">Horário livre</span>
                      ) : (
                        hourApts.map((apt) => (
                          <div
                            key={apt.id}
                            onClick={() => {
                              if (apt.ticketId) setSelectedTicketId(apt.ticketId);
                            }}
                            className="p-2.5 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs transition-all cursor-pointer flex-1 min-w-[220px] max-w-md shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-indigo-900">
                                {apt.startTime} - {apt.endTime}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200">
                                {apt.teamName}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 truncate">{apt.serviceType}</p>
                            <div className="text-[11px] text-slate-500 truncate">{apt.address}</div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 pt-1 border-t border-indigo-100">
                              <span>👤 {apt.technicianName}</span>
                              <span>📞 {apt.clientPhone}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. EQUIPES & PRESTADORES                                 */}
      {/* ======================================================== */}
      {activeTab === 'equipe' && (
        <div className="space-y-6">
          {/* Team specialty cards */}
          {technicians.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-sm font-semibold text-slate-600">Nenhum técnico cadastrado.</p>
              <p className="text-xs text-slate-400 mt-1">
                Cadastre a equipe em <span className="font-semibold">Administração</span> para poder
                designar e agendar atendimentos.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {technicians.map((tech) => {
              const assignedApts = appointments.filter(
                (a) => a.technicianId === tech.id && a.date === todayStr
              );

              return (
                <div
                  key={tech.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                        {tech.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{tech.name}</h4>
                        <span className="text-[11px] text-indigo-600 font-semibold block">
                          {tech.team}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                        tech.status === 'disponivel'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tech.status === 'em_atendimento'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tech.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Telefone:</span>
                      <span className="font-medium text-slate-800">{tech.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Avaliação:</span>
                      <span className="font-bold text-amber-500">⭐ {tech.rating}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Chamados Ativos:</span>
                      <span className="font-bold text-slate-800">{tech.activeCount}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Especialidades:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tech.specialties.map((esp) => (
                        <span
                          key={esp}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium"
                        >
                          {esp}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">
                      Agendados Hoje ({assignedApts.length}):
                    </span>
                    {assignedApts.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Sem serviços agendados para hoje
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {assignedApts.map((a) => (
                          <div
                            key={a.id}
                            className="text-[11px] bg-slate-50 p-1.5 rounded-md border border-slate-200 flex justify-between"
                          >
                            <span className="font-bold text-slate-800">{a.startTime}</span>
                            <span className="truncate max-w-[140px] text-slate-600">
                              {a.serviceType}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Schedule Modal */}
      <ScheduleModal
        isOpen={showNewScheduleModal}
        onClose={() => setShowNewScheduleModal(false)}
        defaultDate={selectedDate}
      />
    </div>
  );
};
