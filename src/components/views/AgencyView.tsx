import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/useApp';
import { MaintenanceTicket } from '../../types';
import { Search, Building, FileText, ChevronRight, BarChart3, Home } from 'lucide-react';
import { getStatusConfig, formatCurrency, getCategoryLabel } from '../../utils/helpers';
import {
  csat,
  distribuicaoPorCategoria,
  taxaAprovacaoOrcamentos,
  tempoMedioAtendimentoDias,
} from '../../domain/metricas';

/** Indicador sem base para cálculo. Dizer isso é melhor do que mostrar zero. */
const SemBase: React.FC<{ texto: string }> = ({ texto }) => (
  <>
    <span className="text-2xl font-black text-slate-300 block mt-1">—</span>
    <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">{texto}</span>
  </>
);

export const AgencyView: React.FC = () => {
  const { userTickets, currentUser, setSelectedTicketId } = useApp();

  const [activeTab, setActiveTab] = useState<'chamados' | 'prontuario' | 'metricas'>('chamados');

  // Filters for Chamados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [selectedPropertyAddress, setSelectedPropertyAddress] = useState<string>('');

  // Indicadores calculados sobre a carteira que a RLS entregou. Quando não há
  // base, a função devolve `null` e a tela diz isso — nunca um número inventado.
  const indicadores = useMemo(
    () => ({
      tempoMedio: tempoMedioAtendimentoDias(userTickets),
      aprovacao: taxaAprovacaoOrcamentos(userTickets),
      satisfacao: csat(userTickets),
      categorias: distribuicaoPorCategoria(userTickets),
    }),
    [userTickets]
  );

  // Filtered tickets strictly restricted to this agency's managed properties
  const filteredTickets = useMemo(() => {
    return userTickets.filter((t) => {
      const matchSearch =
        t.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'todos' || t.status === statusFilter;
      const matchCategory = categoryFilter === 'todos' || t.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [userTickets, searchTerm, statusFilter, categoryFilter]);

  // Unique properties for Prontuário
  const uniqueAddresses = useMemo(() => {
    const map = new Map<string, MaintenanceTicket[]>();
    userTickets.forEach((t) => {
      if (!map.has(t.address)) {
        map.set(t.address, []);
      }
      map.get(t.address)!.push(t);
    });
    return map;
  }, [userTickets]);

  // Set default address for prontuario if empty
  const addressList = Array.from(uniqueAddresses.keys());
  const activeProntuarioAddress = selectedPropertyAddress || addressList[0] || '';
  const prontuarioHistory = uniqueAddresses.get(activeProntuarioAddress) || [];

  // Metrics calculations
  const openCount = userTickets.filter(
    (t) => t.status === 'chamado_aberto' || t.status === 'em_analise'
  ).length;
  const quotePendingCount = userTickets.filter((t) => t.status === 'orcamento_enviado').length;
  const inProgressCount = userTickets.filter(
    (t) =>
      t.status === 'servico_agendado' ||
      t.status === 'em_execucao' ||
      t.status === 'orcamento_aprovado'
  ).length;
  const completedCount = userTickets.filter((t) => t.status === 'concluido').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Welcome & Agency Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-extrabold text-slate-900">
              Painel Imobiliária •{' '}
              {currentUser?.agencyName || currentUser?.name || 'Imobiliária Parceira'}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500">
              Gestão transparente de manutenções prediais e controle de orçamentos da sua carteira
            </p>
            {currentUser?.cnpj && (
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                CNPJ: {currentUser.cnpj}
              </span>
            )}
          </div>
        </div>

        {/* Top Mini Metrics */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
            <span className="text-slate-500 block text-[10px]">Abertos</span>
            <span className="font-extrabold text-purple-900 text-sm">{openCount}</span>
          </div>
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-slate-500 block text-[10px]">Aguardando Aprovação</span>
            <span className="font-extrabold text-amber-900 text-sm">{quotePendingCount}</span>
          </div>
          <div className="px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-xl">
            <span className="text-slate-500 block text-[10px]">Em Execução</span>
            <span className="font-extrabold text-cyan-900 text-sm">{inProgressCount}</span>
          </div>
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-slate-500 block text-[10px]">Concluídos</span>
            <span className="font-extrabold text-emerald-900 text-sm">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('chamados')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'chamados'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Gestão de Chamados ({userTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prontuario')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'prontuario'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Prontuário por Imóvel ({addressList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('metricas')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'metricas'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Métricas & Indicadores de Qualidade</span>
        </button>
      </div>

      {/* TAB 1: CHAMADOS */}
      {activeTab === 'chamados' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por protocolo, inquilino, endereço ou relato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                <option value="todos">Todos os Status</option>
                <option value="chamado_aberto">Chamado Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="aguardando_vistoria">Aguardando Vistoria</option>
                <option value="orcamento_enviado">Orçamento Enviado (Pendente)</option>
                <option value="orcamento_aprovado">Orçamento Aprovado</option>
                <option value="servico_agendado">Agendado</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluido">Concluído</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="hidraulica">💧 Hidráulica</option>
                <option value="eletrica">⚡ Elétrica</option>
                <option value="pintura">🖌️ Pintura</option>
                <option value="infiltracao">🌧️ Infiltração</option>
                <option value="porta_fechadura">🚪 Portas e Fechaduras</option>
              </select>
            </div>
          </div>

          {/* Tickets Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">Protocolo / Data</th>
                    <th className="py-3 px-4">Imóvel & Inquilino</th>
                    <th className="py-3 px-4">Categoria / Ambiente</th>
                    <th className="py-3 px-4">Status Atual</th>
                    <th className="py-3 px-4">Orçamento</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum chamado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const statusCfg = getStatusConfig(ticket.status);

                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedTicketId(ticket.id)}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-extrabold text-slate-900">{ticket.protocol}</div>
                            <div className="text-[11px] text-slate-400">{ticket.createdAt}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{ticket.address}</div>
                            <div className="text-[11px] text-slate-500">
                              {ticket.tenantName} • {ticket.tenantPhone}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {getCategoryLabel(ticket.category)}
                            </div>
                            <div className="text-[11px] text-slate-500">{ticket.environment}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusCfg.bg}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {ticket.quote ? (
                              <div>
                                <span className="font-extrabold text-slate-900 block">
                                  {formatCurrency(ticket.quote.totalCost)}
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    ticket.quote.status === 'aprovado'
                                      ? 'text-emerald-600'
                                      : ticket.quote.status === 'reprovado'
                                        ? 'text-rose-600'
                                        : 'text-amber-600'
                                  }`}
                                >
                                  {ticket.quote.status === 'enviado'
                                    ? 'Aguardando Aprovação'
                                    : ticket.quote.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Sem orçamento</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketId(ticket.id);
                              }}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Detalhar</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRONTUÁRIO POR IMÓVEL */}
      {activeTab === 'prontuario' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Address selector column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Selecione o Imóvel Administrado
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {addressList.length === 0 && (
                <p className="p-6 text-center text-xs text-slate-400">
                  Nenhum imóvel com chamado registrado ainda.
                </p>
              )}
              {addressList.map((addr) => {
                const count = uniqueAddresses.get(addr)?.length || 0;
                const isSelected = addr === activeProntuarioAddress;
                return (
                  <button
                    key={addr}
                    onClick={() => setSelectedPropertyAddress(addr)}
                    className={`w-full text-left p-3.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 border-l-4 border-purple-600 text-purple-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block font-bold">{addr}</span>
                      <span className="text-[11px] text-slate-500">
                        {count} intervenção(ões) registrada(s)
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Property Dossier / Prontuário */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-xs uppercase font-extrabold text-purple-600 tracking-wider">
                    Prontuário Histórico de Manutenções
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {activeProntuarioAddress}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Total de Reparos:</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {prontuarioHistory.length}
                  </span>
                </div>
              </div>

              {/* Maintenance list for this property */}
              <div className="space-y-3">
                {prontuarioHistory.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Nenhuma manutenção registrada para este imóvel.
                  </p>
                )}
                {prontuarioHistory.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all cursor-pointer space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{t.protocol}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-purple-700">
                          {getCategoryLabel(t.category)} - {t.environment}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{t.createdAt}</span>
                    </div>

                    <p className="text-slate-700">{t.description}</p>

                    {t.technicalReport && (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700 block">Diagnóstico Técnico:</span>
                        {t.technicalReport.recommendedSolution}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Inquilino: {t.tenantName}</span>
                      {t.quote && (
                        <span className="font-bold text-slate-900">
                          Valor: {formatCurrency(t.quote.totalCost)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MÉTRICAS & INDICADORES */}
      {activeTab === 'metricas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">
                Tempo Médio de Atendimento
              </span>
              {indicadores.tempoMedio ? (
                <>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {indicadores.tempoMedio.dias.toLocaleString('pt-BR')}{' '}
                    {indicadores.tempoMedio.dias === 1 ? 'dia' : 'dias'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                    Da abertura à conclusão · {indicadores.tempoMedio.base}{' '}
                    {indicadores.tempoMedio.base === 1
                      ? 'chamado concluído'
                      : 'chamados concluídos'}
                  </span>
                </>
              ) : (
                <SemBase texto="Nenhum chamado concluído ainda." />
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">
                Taxa de Aprovação de Orçamentos
              </span>
              {indicadores.aprovacao ? (
                <>
                  <span className="text-2xl font-black text-slate-900 block mt-1">
                    {indicadores.aprovacao.percentual.toLocaleString('pt-BR')}%
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                    Sobre {indicadores.aprovacao.base}{' '}
                    {indicadores.aprovacao.base === 1
                      ? 'orçamento decidido'
                      : 'orçamentos decididos'}
                  </span>
                </>
              ) : (
                <SemBase texto="Nenhum orçamento decidido ainda." />
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block">
                Satisfação do Inquilino (CSAT)
              </span>
              {indicadores.satisfacao ? (
                <>
                  <span className="text-2xl font-black text-amber-500 block mt-1">
                    {indicadores.satisfacao.media.toLocaleString('pt-BR')} ★
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                    Baseado em {indicadores.satisfacao.base}{' '}
                    {indicadores.satisfacao.base === 1 ? 'avaliação' : 'avaliações'}
                  </span>
                </>
              ) : (
                <SemBase texto="Nenhuma avaliação recebida ainda." />
              )}
            </div>
          </div>

          {/* Distribuição real por categoria */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Distribuição de Chamados por Categoria
            </h3>
            {indicadores.categorias.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhum chamado na carteira ainda.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {indicadores.categorias.map((fatia) => (
                  <div key={fatia.categoria} className="space-y-1">
                    <div className="flex justify-between font-medium text-slate-700">
                      <span>{getCategoryLabel(fatia.categoria)}</span>
                      <span className="font-bold">
                        {fatia.quantidade} {fatia.quantidade === 1 ? 'chamado' : 'chamados'} (
                        {fatia.percentual.toLocaleString('pt-BR')}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${fatia.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
