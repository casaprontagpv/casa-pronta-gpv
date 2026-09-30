import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Appointment,
  AppointmentStatus,
  MaintenanceTicket,
  NotificationItem,
  Technician,
  TicketStatus,
  UserRole,
} from '../types';
import { AppContext, type AppContextType } from './appContextTypes';
import { useAuth } from '../auth/useAuth';
import * as api from '../data/tickets';
import { DataError } from '../data/tickets';
import { assinarChamado, assinarListas, type EstadoConexao } from '../data/realtime';

/**
 * Estado de domínio, agora vindo do Postgres.
 *
 * O `localStorage` saiu. Duas consequências que mudam o produto:
 *
 *  1. Os dados são COMPARTILHADOS. A timeline e o chat deixam de existir apenas
 *     na máquina de quem escreveu — que era a limitação mais séria do protótipo.
 *  2. O isolamento é feito pela RLS, não por filtro aqui. O que chega já é o que
 *     a pessoa pode ver.
 *
 * As ações viraram assíncronas porque agora há ida e volta ao banco. Cada uma
 * recarrega o que mudou; quem falha lança `DataError` com a mensagem pronta
 * para a interface.
 */

const mensagemDeErro = (e: unknown): string =>
  e instanceof DataError ? e.message : 'Não foi possível concluir. Tente novamente.';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const currentRole: UserRole = currentUser?.role ?? 'inquilino';

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicketId, setSelectedTicketIdState] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const [conexao, setConexao] = useState<EstadoConexao>('conectando');

  // Descarta resultado de carregamento superado por outro (troca de sessão,
  // clique rápido entre chamados).
  const geracao = useRef(0);
  // Mesma ideia para o detalhe: uma releitura disparada pelo realtime pode
  // chegar depois de o chamado já ter sido fechado.
  const idAberto = useRef<string | null>(null);

  const carregarTudo = useCallback(async () => {
    if (!currentUser) {
      setTickets([]);
      setTechnicians([]);
      setAppointments([]);
      setNotifications([]);
      setLoading(false);
      return;
    }

    const minha = ++geracao.current;
    try {
      // A central precisa da lista de técnicos para designar e agendar; os
      // demais papéis não enxergam a equipe e receberiam vazio de qualquer modo.
      const [cs, ags, nots, tecs] = await Promise.all([
        api.listarChamados(),
        api.listarAgendamentos(),
        api.listarNotificacoes(),
        currentRole === 'empresa' ? api.listarTecnicos() : Promise.resolve([]),
      ]);

      if (minha !== geracao.current) return;
      setTickets(cs);
      setAppointments(ags);
      setNotifications(nots);
      setTechnicians(tecs);
      setError(null);
    } catch (e) {
      if (minha !== geracao.current) return;
      setError(mensagemDeErro(e));
    } finally {
      if (minha === geracao.current) setLoading(false);
    }
  }, [currentUser, currentRole]);

  useEffect(() => {
    setLoading(true);
    void carregarTudo();
  }, [carregarTudo]);

  /**
   * O detalhe traz timeline e chat, que a lista não carrega por serem grandes.
   *
   * `silencioso` é para as releituras do realtime: uma mensagem nova no chat não
   * pode apagar a tela e mostrar spinner, nem transformar uma falha momentânea
   * de rede em faixa de erro sobre um conteúdo que continua correto.
   */
  const carregarDetalhe = useCallback(async (id: string | null, silencioso = false) => {
    if (!id) {
      setSelectedTicket(null);
      return;
    }
    if (!silencioso) setLoadingSelected(true);
    try {
      const chamado = await api.buscarChamado(id);
      if (idAberto.current === id) setSelectedTicket(chamado);
    } catch (e) {
      if (!silencioso) setError(mensagemDeErro(e));
    } finally {
      if (!silencioso) setLoadingSelected(false);
    }
  }, []);

  useEffect(() => {
    idAberto.current = selectedTicketId;
    void carregarDetalhe(selectedTicketId);
  }, [selectedTicketId, carregarDetalhe]);

  const setSelectedTicketId = useCallback((id: string | null) => {
    idAberto.current = id;
    setSelectedTicketIdState(id);
    if (!id) setSelectedTicket(null);
  }, []);

  // ─── Ao vivo ──────────────────────────────────────────────────────────────
  // O evento do Postgres é só o aviso de que algo mudou; quem traz o dado é a
  // releitura normal, com RLS. Ver src/data/realtime.ts.

  useEffect(() => {
    if (!currentUser) {
      setConexao('sem_conexao');
      return;
    }
    return assinarListas(() => void carregarTudo(), setConexao);
  }, [currentUser, carregarTudo]);

  useEffect(() => {
    if (!selectedTicketId) return;
    return assinarChamado(selectedTicketId, () => void carregarDetalhe(selectedTicketId, true));
  }, [selectedTicketId, carregarDetalhe]);

  /** Recarrega listas e, se houver, o detalhe aberto. */
  const refresh = useCallback(async () => {
    await Promise.all([carregarTudo(), carregarDetalhe(selectedTicketId)]);
  }, [carregarTudo, carregarDetalhe, selectedTicketId]);

  /**
   * Executa a ação e recarrega o que ela pode ter mudado.
   *
   * Continua explícito mesmo com o realtime ligado: quem agiu precisa ver o
   * resultado do próprio clique, e o realtime pode estar fora do ar — WebSocket
   * bloqueado por proxy corporativo, rede de celular caindo. O evento que volta
   * para quem agiu cai na mesma janela de agrupamento e não vira segunda leitura.
   */
  const agirERecarregar = useCallback(
    async (acao: () => Promise<void>) => {
      await acao();
      await refresh();
    },
    [refresh]
  );

  const acoes = useMemo(
    () => ({
      createTicket: async (dados: api.NovoChamado) => {
        const id = await api.criarChamado(dados);
        await refresh();
        return id;
      },

      updateTicketStatus: (ticketId: string, status: TicketStatus, descricao?: string) =>
        agirERecarregar(() => api.mudarStatus(ticketId, status, descricao)),

      assignTechnician: (ticketId: string, technicianId: string) =>
        agirERecarregar(() => api.designarTecnico(ticketId, technicianId)),

      addChatMessage: (ticketId: string, texto: string) =>
        agirERecarregar(() => api.enviarMensagem(ticketId, texto)),

      saveTechnicalReport: (ticketId: string, p: api.ParecerTecnico) =>
        agirERecarregar(() => api.salvarParecer(ticketId, p)),

      submitQuote: (ticketId: string, o: api.NovoOrcamento) =>
        agirERecarregar(() => api.enviarOrcamento(ticketId, o)),

      reviewQuote: (quoteId: string, aprovar: boolean, motivo?: string) =>
        agirERecarregar(() => api.decidirOrcamento(quoteId, aprovar, motivo)),

      scheduleAppointment: (dados: api.NovoAgendamento) =>
        agirERecarregar(() => api.agendar(dados)),

      updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) =>
        agirERecarregar(() => api.mudarStatusAgendamento(appointmentId, status)),

      finalizeService: (ticketId: string, c: api.ConclusaoServico) =>
        agirERecarregar(() => api.concluirServico(ticketId, c)),

      confirmTenantCompletion: (ticketId: string) =>
        agirERecarregar(() => api.confirmarConclusao(ticketId)),

      submitEvaluation: (ticketId: string, a: api.NovaAvaliacao) =>
        agirERecarregar(() => api.avaliar(ticketId, a)),

      markNotificationAsRead: async (id: string) => {
        // Otimista: marcar como lida é irrelevante se falhar, e esperar o banco
        // deixaria o clique parecendo travado.
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        await api.marcarNotificacaoLida(id);
      },

      markAllNotificationsAsRead: async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        await api.marcarTodasLidas();
      },
    }),
    [agirERecarregar, refresh]
  );

  const value = useMemo<AppContextType>(
    () => ({
      currentUser,
      currentRole,
      tickets,
      // A RLS já filtrou: as duas listas são a mesma.
      userTickets: tickets,
      technicians,
      appointments,
      userAppointments: appointments,
      notifications,
      loading,
      error,
      refresh,
      selectedTicket,
      setSelectedTicketId,
      loadingSelected,
      conexao,
      ...acoes,
    }),
    [
      currentUser,
      currentRole,
      tickets,
      technicians,
      appointments,
      notifications,
      loading,
      error,
      refresh,
      selectedTicket,
      setSelectedTicketId,
      loadingSelected,
      conexao,
      acoes,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
