import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import { UserRole } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  Wrench,
  Building2,
  Home,
  UserCheck,
  Bell,
  PlusCircle,
  RotateCcw,
  CheckCheck,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewTicket: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewTicket }) => {
  const {
    activePortalTab,
    setActivePortalTab,
    currentUser,
    logout,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    resetDemoData,
    setSelectedTicketId,
  } = useApp();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Filter notifications relevant to current role
  const roleNotifs = notifications.filter(
    (n) => n.targetRoles.includes(activePortalTab) || n.targetRoles.length === 0
  );
  const unreadCount = roleNotifs.filter((n) => !n.read).length;

  const tabs: {
    role: UserRole;
    label: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
  }[] = [
    {
      role: 'inquilino',
      label: 'Área do Inquilino',
      subtitle: 'Seu Imóvel & Chamados',
      icon: Home,
      color: 'emerald',
    },
    {
      role: 'imobiliaria',
      label: 'Portal da Imobiliária',
      subtitle: 'Carteira & Aprovações',
      icon: Building2,
      color: 'purple',
    },
    {
      role: 'empresa',
      label: 'Central Prestadora',
      subtitle: 'Operações & Equipes',
      icon: Wrench,
      color: 'indigo',
    },
    {
      role: 'prestador',
      label: 'Técnico de Campo',
      subtitle: 'Rotas & Execução',
      icon: UserCheck,
      color: 'cyan',
    },
  ];

  const isAuthenticatedForTab = currentUser !== null && currentUser.role === activePortalTab;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner: sessão do usuário e utilitários de demonstração */}
      <div className="bg-slate-900 text-white px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {isAuthenticatedForTab ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Sessão Ativa:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {currentUser.name}
              </span>
              {currentUser.propertyAddress && (
                <span className="hidden md:inline text-slate-400 text-[11px]">
                  ({currentUser.propertyAddress})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300 font-semibold">
                Acesso Restrito: Identifique-se para acessar este portal
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          {/* User Account / Logout Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-medium hidden md:inline truncate max-w-[150px]">
                {currentUser.name}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-[11px] bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
                title="Sair da conta atual para fazer novo login"
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-amber-300 font-bold px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-800/40">
              Desconectado
            </span>
          )}

          {/* Reset Demo Data Button — confirmação em dois passos, sem confirm() nativo */}
          {confirmingReset ? (
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="text-amber-300 font-semibold">Restaurar dados originais?</span>
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
              title="Resetar dados para estado inicial"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Resetar Dados</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <Wrench className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                Casa Pronta
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Manutenção Predial
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Plataforma Integrada: Inquilino • Imobiliária • Prestadora
            </p>
          </div>
        </div>

        {/* Portal Selector Tabs (Center) */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePortalTab === tab.role;
            return (
              <button
                key={tab.role}
                onClick={() => setActivePortalTab(tab.role)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? tab.role === 'inquilino'
                        ? 'text-emerald-600'
                        : tab.role === 'imobiliaria'
                          ? 'text-purple-600'
                          : tab.role === 'empresa'
                            ? 'text-indigo-600'
                            : 'text-cyan-600'
                      : 'text-slate-400'
                  }`}
                />
                <div className="text-left">
                  <span className="block leading-tight">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Notifications & New Ticket CTA */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Tab Select */}
          <div className="lg:hidden">
            <select
              value={activePortalTab}
              onChange={(e) => setActivePortalTab(e.target.value as UserRole)}
              className="text-xs bg-slate-100 border border-slate-300 rounded-xl px-2 py-1.5 font-bold text-slate-800"
            >
              <option value="inquilino">👤 Área do Inquilino</option>
              <option value="imobiliaria">🏢 Portal da Imobiliária</option>
              <option value="empresa">🛠️ Central da Prestadora</option>
              <option value="prestador">🧰 Técnico de Campo</option>
            </select>
          </div>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notificações do sistema"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Notificações Automáticas
                    </span>
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
                      Nenhuma notificação para este perfil no momento.
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

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
                  Atualizações automáticas da linha do tempo
                </div>
              </div>
            )}
          </div>

          {/* New Ticket CTA */}
          <button
            onClick={onOpenNewTicket}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Abrir Chamado</span>
          </button>
        </div>
      </div>
    </header>
  );
};
