import React, { useState } from 'react';
import { MaintenanceTicket } from '../types';
import {
  X,
  Clock,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Star,
  Phone,
  MapPin,
  Send,
  Share2,
  Check,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../context/useApp';
import { TimelineViewer } from './TimelineViewer';
import {
  getStatusConfig,
  getPriorityConfig,
  formatCurrency,
  generateWhatsAppLink,
  getAppointmentStatusConfig,
} from '../utils/helpers';
import { TechnicalReportModal } from './TechnicalReportModal';
import { QuoteModal } from './QuoteModal';
import { ScheduleModal } from './ScheduleModal';
import { ServiceCompletionModal } from './ServiceCompletionModal';
import { EvaluationModal } from './EvaluationModal';

type DetailTab =
  'timeline' | 'chat' | 'report' | 'quote' | 'schedule' | 'completion' | 'evaluation';

interface TicketDetailModalProps {
  ticket: MaintenanceTicket;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  const {
    currentRole,
    updateTicketStatus,
    addChatMessage,
    confirmTenantCompletion,
    updateAppointmentStatus,
  } = useApp();

  const [activeTab, setActiveTab] = useState<DetailTab>('timeline');

  const [chatInput, setChatInput] = useState('');

  // Submodals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);

  if (!isOpen) return null;

  const statusCfg = getStatusConfig(ticket.status);
  const priorityCfg = getPriorityConfig(ticket.urgency);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    addChatMessage(ticket.id, chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Bar with Status & Protocol */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-white tracking-tight">
              {ticket.protocol}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusCfg.bg}`}
            >
              {statusCfg.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityCfg.badge}`}
            >
              {priorityCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct WhatsApp Share button */}
            <a
              href={generateWhatsAppLink(
                ticket.tenantPhone,
                `Atualização sobre o chamado ${ticket.protocol} no imóvel ${ticket.address}: Status atual "${statusCfg.label}".`
              )}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Abrir mensagem pré-formatada no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Context Summary Header */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-900">{ticket.address}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              {ticket.environment} ({ticket.category})
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Inquilino:</span>
              <span className="font-semibold text-slate-900">{ticket.tenantName}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{ticket.tenantPhone}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white overflow-x-auto text-xs font-semibold">
          {(
            [
              { key: 'timeline', label: 'Linha do Tempo & Resumo', icon: Clock },
              {
                key: 'chat',
                label: `Chat do Chamado (${ticket.chatMessages.length})`,
                icon: MessageSquare,
              },
              {
                key: 'report',
                label: ticket.technicalReport ? 'Parecer Técnico ✓' : 'Parecer Técnico',
                icon: FileText,
              },
              {
                key: 'quote',
                label: ticket.quote
                  ? `Orçamento (${formatCurrency(ticket.quote.totalCost)})`
                  : 'Orçamento',
                icon: DollarSign,
              },
              {
                key: 'schedule',
                label: ticket.appointment ? 'Agendamento ✓' : 'Agendamento',
                icon: Calendar,
              },
              {
                key: 'completion',
                label: ticket.completion ? 'Conclusão ✓' : 'Conclusão',
                icon: CheckCircle2,
              },
              {
                key: 'evaluation',
                label: ticket.evaluation ? `Avaliação (${ticket.evaluation.rating}★)` : 'Avaliação',
                icon: Star,
              },
            ] satisfies { key: DetailTab; label: string; icon: LucideIcon }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB: TIMELINE & OVERVIEW */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Role-Specific Action Bar (Central de Decisão) */}
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Ações Recomendadas para seu Perfil ({currentRole})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Clique para avançar etapas instantaneamente
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Agency Actions */}
                  {(currentRole === 'imobiliaria' || currentRole === 'empresa') && (
                    <>
                      {ticket.status === 'chamado_aberto' && (
                        <button
                          onClick={() =>
                            updateTicketStatus(
                              ticket.id,
                              'em_analise',
                              'Imobiliária analisou o chamado e autorizou a vistoria técnica.'
                            )
                          }
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          Autorizar Vistoria
                        </button>
                      )}

                      {ticket.status === 'orcamento_enviado' && (
                        <button
                          onClick={() => {
                            setActiveTab('quote');
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>
                            Avaliar Orçamento de {formatCurrency(ticket.quote?.totalCost || 0)}
                          </span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Company / Technician Actions */}
                  {(currentRole === 'empresa' || currentRole === 'prestador') && (
                    <>
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {ticket.technicalReport
                            ? 'Editar Parecer Técnico'
                            : 'Preencher Parecer Técnico'}
                        </span>
                      </button>

                      <button
                        onClick={() => setShowQuoteModal(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{ticket.quote ? 'Editar Orçamento' : 'Criar Orçamento'}</span>
                      </button>

                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Agendar / Reagendar Serviço</span>
                      </button>

                      {ticket.status === 'servico_agendado' && (
                        <button
                          onClick={() =>
                            updateTicketStatus(
                              ticket.id,
                              'em_execucao',
                              `Técnico iniciou a execução do serviço no imóvel.`
                            )
                          }
                          className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          Iniciar Execução no Imóvel
                        </button>
                      )}

                      {(ticket.status === 'em_execucao' ||
                        ticket.status === 'servico_agendado') && (
                        <button
                          onClick={() => setShowCompletionModal(true)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Registrar Conclusão</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Tenant Actions */}
                  {currentRole === 'inquilino' && (
                    <>
                      {ticket.appointment && !ticket.appointment.tenantConfirmed && (
                        <button
                          onClick={() =>
                            updateAppointmentStatus(ticket.appointment!.id, 'confirmado')
                          }
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar Minha Presença no Agendamento</span>
                        </button>
                      )}

                      {ticket.status === 'concluido' && !ticket.completion?.tenantConfirmed && (
                        <button
                          onClick={() => confirmTenantCompletion(ticket.id)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar que o Serviço Foi Realizado</span>
                        </button>
                      )}

                      {ticket.status === 'concluido' && !ticket.evaluation && (
                        <button
                          onClick={() => setShowEvalModal(true)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Star className="w-4 h-4 fill-white" />
                          <span>Avaliar Atendimento (5 Estrelas)</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Photos & Problem Description */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Relato do Problema
                </h4>
                <p className="text-xs text-slate-800 leading-relaxed mb-4">{ticket.description}</p>

                {ticket.photos.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Fotos Enviadas pelo Inquilino
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {ticket.photos.map((src, idx) => (
                        <a
                          key={idx}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={src}
                            alt="Foto do chamado"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Timeline Component */}
              <TimelineViewer ticket={ticket} />
            </div>
          )}

          {/* TAB: CENTRALIZED CHAT */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col h-[500px]">
              <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Comunicação Oficial do Chamado
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Todas as mensagens ficam registradas e visíveis para Inquilino, Imobiliária e
                    Empresa.
                  </p>
                </div>
                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-medium">
                  Substituto do WhatsApp
                </span>
              </div>

              {/* Message history */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {ticket.chatMessages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    Nenhuma mensagem registrada ainda. Inicie a conversa abaixo!
                  </div>
                ) : (
                  ticket.chatMessages.map((msg) => {
                    const isSelf = msg.senderRole === currentRole;
                    const roleBadgeColor =
                      msg.senderRole === 'inquilino'
                        ? 'bg-emerald-100 text-emerald-800'
                        : msg.senderRole === 'imobiliaria'
                          ? 'bg-purple-100 text-purple-800'
                          : msg.senderRole === 'empresa'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-cyan-100 text-cyan-800';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700">{msg.senderName}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-xs font-semibold ${roleBadgeColor}`}
                          >
                            {msg.senderRole}
                          </span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs ${
                            isSelf
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          <p className="leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Preset Phrases */}
              <div className="py-2 flex flex-wrap gap-1.5 border-t border-slate-100 mt-2">
                {[
                  'Vistoria autorizada',
                  'Orçamento disponibilizado no sistema',
                  'Técnico a caminho do imóvel',
                  'Aguardando peças de reposição',
                ].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => addChatMessage(ticket.id, phrase)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                  >
                    + &quot;{phrase}&quot;
                  </button>
                ))}
              </div>

              {/* Input box */}
              <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Escreva como ${currentRole}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB: TECHNICAL REPORT (PARECER TÉCNICO) */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Parecer Técnico do Prestador</h4>
                  <p className="text-xs text-slate-500">
                    Laudo pericial emitido após vistoria presencial no imóvel
                  </p>
                </div>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {ticket.technicalReport ? 'Editar Parecer' : 'Preencher Novo Parecer'}
                </button>
              </div>

              {ticket.technicalReport ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-500 block">
                        Técnico Responsável:
                      </span>
                      <span className="font-bold text-indigo-900 text-sm">
                        {ticket.technicalReport.technicianName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-500 block">Data da Vistoria:</span>
                      <span className="font-bold text-slate-800">
                        {ticket.technicalReport.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">
                        Situação Encontrada no Local:
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {ticket.technicalReport.situationFound}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-1">Possível Causa:</span>
                      <p className="text-slate-700 leading-relaxed">
                        {ticket.technicalReport.possibleCause}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Solução Técnica Recomendada:
                    </span>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {ticket.technicalReport.recommendedSolution}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">Materiais Necessários:</span>
                      <span className="font-bold text-slate-800">
                        {ticket.technicalReport.requiredMaterials}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">Necessita Orçamento?</span>
                      <span
                        className={`font-bold ${
                          ticket.technicalReport.needsQuote ? 'text-indigo-600' : 'text-slate-600'
                        }`}
                      >
                        {ticket.technicalReport.needsQuote ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">Necessita Retorno?</span>
                      <span
                        className={`font-bold ${
                          ticket.technicalReport.needsReturn ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {ticket.technicalReport.needsReturn ? 'SIM' : 'NÃO'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhum parecer técnico registrado ainda. Clique no botão acima para registrar.
                </div>
              )}
            </div>
          )}

          {/* TAB: QUOTE */}
          {activeTab === 'quote' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Orçamento do Serviço</h4>
                  <p className="text-xs text-slate-500">
                    Valores discriminados de materiais e mão de obra
                  </p>
                </div>

                <button
                  onClick={() => setShowQuoteModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {ticket.quote ? 'Abrir / Avaliar Orçamento' : 'Criar Orçamento'}
                </button>
              </div>

              {ticket.quote ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                        Status do Orçamento:
                      </span>
                      <span className="text-sm font-extrabold text-emerald-950 capitalize">
                        {ticket.quote.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-800 block">Total:</span>
                      <span className="text-2xl font-black text-slate-900">
                        {formatCurrency(ticket.quote.totalCost)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-700 block">Descrição do Serviço:</span>
                    <p className="text-slate-800 leading-relaxed">
                      {ticket.quote.serviceDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold block">
                        Materiais e Insumos:
                      </span>
                      <p className="text-slate-800 mt-1">{ticket.quote.materialsSummary}</p>
                      <span className="text-sm font-bold text-slate-900 mt-1.5 block">
                        {formatCurrency(ticket.quote.materialsCost)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold block">
                        Mão de Obra Técnica:
                      </span>
                      <p className="text-slate-800 mt-1">{ticket.quote.laborSummary}</p>
                      <span className="text-sm font-bold text-slate-900 mt-1.5 block">
                        {formatCurrency(ticket.quote.laborCost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Prazo de Execução:</span>
                    <span className="font-bold text-slate-900">
                      {ticket.quote.executionDeadlineDays} dia(s) útil(eis)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhum orçamento emitido para este chamado ainda.
                </div>
              )}
            </div>
          )}

          {/* TAB: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Agendamento da Manutenção</h4>
                  <p className="text-xs text-slate-500">
                    Data, horário e prestador alocado para o imóvel
                  </p>
                </div>

                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {ticket.appointment ? 'Alterar Agendamento' : 'Agendar Visita'}
                </button>
              </div>

              {ticket.appointment ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 block">
                        Data e Horário Marcados:
                      </span>
                      <span className="text-base font-extrabold text-indigo-950">
                        {new Date(ticket.appointment.date + 'T00:00:00').toLocaleDateString(
                          'pt-BR'
                        )}{' '}
                        das {ticket.appointment.startTime} às {ticket.appointment.endTime}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getAppointmentStatusConfig(ticket.appointment.status).color}`}
                    >
                      {getAppointmentStatusConfig(ticket.appointment.status).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold block">Técnico Designado:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {ticket.appointment.technicianName}
                      </span>
                      <p className="text-[11px] text-slate-500">{ticket.appointment.teamName}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold block">
                        Confirmação do Inquilino:
                      </span>
                      <span
                        className={`font-bold ${
                          ticket.appointment.tenantConfirmed ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {ticket.appointment.tenantConfirmed
                          ? '✓ Confirmado pelo Inquilino'
                          : 'Aguardando confirmação'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhum agendamento realizado para este chamado ainda.
                </div>
              )}
            </div>
          )}

          {/* TAB: COMPLETION */}
          {activeTab === 'completion' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Conclusão e Garantia do Serviço
                  </h4>
                  <p className="text-xs text-slate-500">
                    Registro de encerramento e fotos do resultado
                  </p>
                </div>

                {!ticket.completion && (
                  <button
                    onClick={() => setShowCompletionModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Registrar Conclusão
                  </button>
                )}
              </div>

              {ticket.completion ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900 block text-sm">
                        Serviço Concluído em {ticket.completion.completionDate}
                      </span>
                      <span className="text-emerald-700">
                        Garantia: {ticket.completion.warrantyMonths} meses assegurados
                      </span>
                    </div>
                    {ticket.completion.tenantConfirmed && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                        ✓ Validado pelo Inquilino
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Serviço Efetivamente Realizado:
                    </span>
                    <p className="text-slate-800">{ticket.completion.servicesPerformed}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">
                      Materiais Utilizados:
                    </span>
                    <p className="text-slate-800">{ticket.completion.materialsUsed}</p>
                  </div>

                  {/* Before / After Photos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-bold text-slate-600 block mb-1.5">Foto do Antes</span>
                      <div className="h-32 rounded-lg overflow-hidden border border-slate-200">
                        {ticket.completion.beforePhotos[0] && (
                          <img
                            src={ticket.completion.beforePhotos[0]}
                            alt="Antes"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-600 block mb-1.5">Foto do Depois</span>
                      <div className="h-32 rounded-lg overflow-hidden border border-slate-200">
                        {ticket.completion.afterPhotos[0] && (
                          <img
                            src={ticket.completion.afterPhotos[0]}
                            alt="Depois"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  O serviço ainda não foi registrado como concluído.
                </div>
              )}
            </div>
          )}

          {/* TAB: EVALUATION */}
          {activeTab === 'evaluation' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Avaliação do Atendimento</h4>
                  <p className="text-xs text-slate-500">
                    Feedback de qualidade prestado pelo inquilino
                  </p>
                </div>

                {!ticket.evaluation && (
                  <button
                    onClick={() => setShowEvalModal(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Avaliar Agora
                  </button>
                )}
              </div>

              {ticket.evaluation ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-5 h-5 ${
                              s <= ticket.evaluation!.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">
                        Registrado em {ticket.evaluation.createdAt}
                      </span>
                    </div>
                    <span className="text-xl font-extrabold text-slate-900">
                      {ticket.evaluation.rating} / 5
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] mb-1">
                        Problema Resolvido?
                      </span>
                      <span className="font-bold text-emerald-600">
                        {ticket.evaluation.solved ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] mb-1">Satisfatório?</span>
                      <span className="font-bold text-emerald-600">
                        {ticket.evaluation.satisfactory ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[11px] mb-1">Pontualidade?</span>
                      <span className="font-bold text-emerald-600">
                        {ticket.evaluation.punctual ? 'SIM' : 'NÃO'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Comentários:</span>
                    <p className="text-slate-800 italic">
                      &quot;{ticket.evaluation.comments || 'Sem comentários adicionais.'}&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhuma avaliação registrada ainda.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submodals */}
        <TechnicalReportModal
          ticket={ticket}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
        <QuoteModal
          ticket={ticket}
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          mode={ticket.quote ? 'review' : 'create'}
        />
        <ScheduleModal
          ticket={ticket}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />
        <ServiceCompletionModal
          ticket={ticket}
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
        />
        <EvaluationModal
          ticket={ticket}
          isOpen={showEvalModal}
          onClose={() => setShowEvalModal(false)}
        />
      </div>
    </div>
  );
};
