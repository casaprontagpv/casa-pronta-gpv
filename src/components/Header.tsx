import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, KeyRound, LogOut, PlusCircle, RotateCcw, Wrench } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useAuth } from '../auth/useAuth';
import { ROLE_LABELS } from '../utils/helpers';
import type { UserRole } from '../types';

interface HeaderProps {
  onOpenNewTicket: () => void;
}

/** Cor de identidade de cada portal (CLAUDE.md §13). */
const ROLE_ACCENT: Record<UserRole, string> = {
  inquilino: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  imobiliaria: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  empresa: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  prestador: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export const Header: React.FC<HeaderProps> = ({ onOpenNewTicket }) => {
  const {
    currentUser,
    currentRole,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    resetDemoData,
    setSelectedTicketId,
  } = useApp();
  const { signOut } = useAuth();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // O protótipo tinha um seletor de portal no cabeçalho. Ele sumiu: o portal é
  // derivado do papel da conta, e trocar de perfil agora exige outra sessão.
  const roleNotifs = notifications.filter(
    (n) => n.targetRoles.includes(currentRole) || n.targetRoles.length === 0
  );
  const unreadCount = roleNotifs.filter((n) => !n.read).length;

  const podeAbrirChamado = currentRole === 'inquilino' || currentRole === 'imobiliaria';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Faixa superior: sessão e utilitários */}
      <div className="bg-slate-900 text-white px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-slate-400 shrink-0">Sessão:</span>
          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 truncate max-w-[220px]">
            {currentUser?.name}
          </span>
          <span
            className={`hidden sm:inline px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${ROLE_ACCENT[currentRole]}`}
          >
            {ROLE_LABELS[currentRole]}
          </span>
          {currentUser?.propertyAddress && (
            <span className="hidden lg:inline text-slate-400 text-[11px] truncate">
              ({currentUser.propertyAddress})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <Link
            to="/nova-senha"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
            title="Alterar minha senha"
          >
            <KeyRound className="w-3 h-3" />
            <span className="hidden sm:inline">Alterar senha</span>
          </Link>

          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 text-[11px] bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            title="Encerrar a sessão"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair</span>
          </button>

          {/* Utilitário de demonstração: some quando os dados vierem do banco. */}
          {confirmingReset ? (
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="text-amber-300 font-semibold">Restaurar dados de demonstração?</span>
              <button
                onClick={() => {
                  resetDemoData();
                  setConfirmingReset(false);
                }}
                className="px-2 py-0.5 rounded-md bg-rose-700 hover:bg-rose-600 text-white font-bold transition-colors cursor-pointer"
              >
                Sim
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="px-2 py-0.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold transition-colors cursor-pointer"
              >
                Não
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingReset(true)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Resetar os dados de demonstração"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Resetar Dados</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <Wrench className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                Casa Pronta
              </h1>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Manutenção Predial
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {ROLE_LABELS[currentRole]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu((v) => !v)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notificações"
              aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Notificações</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
                        {unreadCount} novas
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar lidas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {roleNotifs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Nenhuma notificação no momento.
                    </div>
                  ) : (
                    roleNotifs.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.ticketId) {
                            setSelectedTicketId(notif.ticketId);
                            setShowNotifMenu(false);
                          }
                        }}
                        className={`p-3.5 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                          !notif.read ? 'bg-indigo-50/40 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`font-bold ${!notif.read ? 'text-indigo-900' : 'text-slate-800'}`}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {podeAbrirChamado && (
            <button
              onClick={onOpenNewTicket}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Abrir Chamado</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
