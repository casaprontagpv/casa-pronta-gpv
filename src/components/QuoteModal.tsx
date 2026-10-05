import React, { useState } from 'react';
import { MaintenanceTicket } from '../types';
import { X, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useAcao } from '../hooks/useAcao';
import { ErroAcao } from './ErroAcao';
import { formatCurrency } from '../utils/helpers';

interface QuoteModalProps {
  ticket: MaintenanceTicket;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'review';
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  ticket,
  isOpen,
  onClose,
  mode = 'create',
}) => {
  const { submitQuote, reviewQuote } = useApp();

  // Valores e descrições começam vazios. Vinham pré-preenchidos com R$ 140 / R$ 220
  // e textos genéricos — a imobiliária podia aprovar um orçamento que ninguém orçou.
  // O resumo de materiais herda o parecer técnico, que é dado real do chamado.
  const [serviceDescription, setServiceDescription] = useState(
    ticket.quote?.serviceDescription ?? ''
  );
  const [materialsSummary, setMaterialsSummary] = useState(
    ticket.quote?.materialsSummary ?? ticket.technicalReport?.requiredMaterials ?? ''
  );
  const [laborSummary, setLaborSummary] = useState(ticket.quote?.laborSummary ?? '');
  const [materialsCost, setMaterialsCost] = useState<number>(ticket.quote?.materialsCost ?? 0);
  const [laborCost, setLaborCost] = useState<number>(ticket.quote?.laborCost ?? 0);
  const [executionDeadlineDays, setExecutionDeadlineDays] = useState<number>(
    ticket.quote?.executionDeadlineDays ?? 1
  );
  const [notes, setNotes] = useState(ticket.quote?.notes ?? '');

  // Review state
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectField, setShowRejectField] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Antes do early return: hook não pode ser chamado condicionalmente.
  const { salvando, erro, executar } = useAcao();

  if (!isOpen) return null;

  const totalCost = Number(materialsCost || 0) + Number(laborCost || 0);
  const existingQuote = ticket.quote;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // `totalCost` não é enviado: é coluna gerada no banco (materiais + mão de obra).
    await executar(
      () =>
        submitQuote(ticket.id, {
          serviceDescription,
          materialsSummary,
          laborSummary,
          materialsCost: Number(materialsCost),
          laborCost: Number(laborCost),
          executionDeadlineDays: Number(executionDeadlineDays),
          notes,
        }),
      onClose
    );
  };

  // A decisão é sobre uma VERSÃO do orçamento, não sobre o chamado: agora há
  // histórico, e aprovar precisa dizer qual delas.
  const handleApprove = async () => {
    if (!existingQuote) return;
    await executar(() => reviewQuote(existingQuote.id, true), onClose);
  };

  const handleReject = async () => {
    // Motivo obrigatório: é ele que justifica a recusa na timeline auditável (CLAUDE.md §8).
    if (!rejectionReason.trim()) {
      setRejectionError('Informe a justificativa da reprovação.');
      return;
    }
    setRejectionError(null);
    if (!existingQuote) return;
    await executar(() => reviewQuote(existingQuote.id, false, rejectionReason), onClose);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {existingQuote ? 'Orçamento de Manutenção' : 'Gerar Orçamento Técnico'}
              </h3>
              <p className="text-xs text-slate-400">
                Chamado {ticket.protocol} • {ticket.address}
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

        {/* Existing Quote Review Mode (Imobiliária or View) */}
        {existingQuote && mode === 'review' ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                existingQuote.status === 'aprovado'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : existingQuote.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {existingQuote.status === 'aprovado' ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : existingQuote.status === 'reprovado' ? (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider block">
                    Status do Orçamento:
                  </span>
                  <span className="text-sm font-extrabold capitalize">
                    {existingQuote.status === 'enviado'
                      ? 'Aguardando Aprovação da Imobiliária'
                      : existingQuote.status === 'aprovado'
                        ? 'Aprovado para Execução'
                        : 'Reprovado'}
                  </span>
                </div>
              </div>
              <span className="text-xl font-black text-slate-900">
                {formatCurrency(existingQuote.totalCost)}
              </span>
            </div>

            {existingQuote.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <span className="font-bold">Motivo da Reprovação: </span>
                {existingQuote.rejectionReason}
              </div>
            )}

            {/* Breakdown card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">Descrição do Serviço:</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {existingQuote.serviceDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <span className="font-semibold text-slate-500 block">Materiais e Insumos:</span>
                  <p className="text-slate-800 mt-0.5">{existingQuote.materialsSummary}</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {formatCurrency(existingQuote.materialsCost)}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Mão de Obra Técnica:</span>
                  <p className="text-slate-800 mt-0.5">{existingQuote.laborSummary}</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {formatCurrency(existingQuote.laborCost)}
                  </p>
                </div>
              </div>

              {/* A garantia NÃO é campo do orçamento: ela é definida no registro
                  de conclusão, pelo técnico que executou. O valor fixo de "90
                  dias inclusa" que havia aqui prometia um prazo contratual que
                  ninguém tinha acordado, na tela em que a imobiliária aprova. */}
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500 block">Prazo de Execução:</span>
                <p className="text-slate-800 font-bold mt-0.5">
                  {existingQuote.executionDeadlineDays} dia(s) útil(eis)
                </p>
              </div>

              {existingQuote.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-500 block">Observações:</span>
                  <p className="text-slate-700 italic mt-0.5">{existingQuote.notes}</p>
                </div>
              )}
            </div>

            {/* Approval Actions for Agency */}
            {existingQuote.status === 'enviado' && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <span className="block text-xs font-bold text-slate-700">
                  Decisão da Imobiliária:
                </span>

                {showRejectField ? (
                  <div className="space-y-2 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    <label className="block text-xs font-bold text-rose-900">
                      Justificativa da Reprovação *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Ex: Valor dos materiais acima do teto estipulado em contrato, solicitar segunda cotação..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    {rejectionError && (
                      <p role="alert" className="text-xs font-bold text-rose-700">
                        {rejectionError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRejectField(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={salvando}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg cursor-pointer"
                      >
                        {salvando ? 'ENVIANDO…' : 'Confirmar Reprovação'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRejectField(true)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>REPROVAR ORÇAMENTO</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={salvando}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{salvando ? 'ENVIANDO…' : 'APROVAR ORÇAMENTO'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Create or Edit Quote Form */
          <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Detalhada do Serviço *
              </label>
              <textarea
                required
                rows={2}
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Materiais e Peças Utilizadas *
              </label>
              <textarea
                required
                rows={2}
                value={materialsSummary}
                onChange={(e) => setMaterialsSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Escopo da Mão de Obra *
              </label>
              <input
                type="text"
                required
                value={laborSummary}
                onChange={(e) => setLaborSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Financials & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Custo Materiais (R$) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={materialsCost}
                  onChange={(e) => setMaterialsCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mão de Obra (R$) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={laborCost}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Prazo (Dias Úteis)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={executionDeadlineDays}
                  onChange={(e) => setExecutionDeadlineDays(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div className="sm:col-span-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Valor Total do Orçamento:</span>
                <span className="text-lg font-extrabold text-emerald-600">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações Adicionais
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <ErroAcao mensagem={erro} />

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
                disabled={salvando}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg shadow-sm shadow-emerald-200 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{salvando ? 'ENVIANDO…' : 'Enviar Orçamento para Imobiliária'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
