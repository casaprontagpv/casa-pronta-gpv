import React, { useState } from 'react';
import { MaintenanceTicket, PriorityLevel } from '../types';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useAcao } from '../hooks/useAcao';
import { ErroAcao } from './ErroAcao';
import { enviarFoto } from '../data/photos';
import { PhotoUploader, descartarPreviews, type FotoSelecionada } from './photos/PhotoUploader';

interface TechnicalReportModalProps {
  ticket: MaintenanceTicket;
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalReportModal: React.FC<TechnicalReportModalProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  const { saveTechnicalReport } = useApp();

  // Campos do laudo começam VAZIOS. Vinham pré-preenchidos com um diagnóstico
  // hidráulico fictício — o técnico podia salvar um parecer que nunca escreveu,
  // e esse texto vira registro permanente na timeline auditável.
  const [situationFound, setSituationFound] = useState(
    ticket.technicalReport?.situationFound ?? ''
  );
  const [possibleCause, setPossibleCause] = useState(ticket.technicalReport?.possibleCause ?? '');
  const [recommendedSolution, setRecommendedSolution] = useState(
    ticket.technicalReport?.recommendedSolution ?? ''
  );
  const [requiredMaterials, setRequiredMaterials] = useState(
    ticket.technicalReport?.requiredMaterials ?? ''
  );
  const [needsQuote, setNeedsQuote] = useState(
    ticket.technicalReport ? ticket.technicalReport.needsQuote : true
  );
  const [needsReturn, setNeedsReturn] = useState(
    ticket.technicalReport ? ticket.technicalReport.needsReturn : false
  );
  const [recommendedPriority, setRecommendedPriority] = useState<PriorityLevel>(
    ticket.technicalReport?.recommendedPriority || ticket.urgency || 'alta'
  );

  const [fotos, setFotos] = useState<FotoSelecionada[]>([]);

  // Antes do early return: hook não pode ser chamado condicionalmente.
  const { salvando, erro, executar } = useAcao();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Técnico e nome vêm do chamado no servidor: o parecer é de quem está
    // designado, não de quem a tela escolheu.
    await executar(async () => {
      await saveTechnicalReport(ticket.id, {
        situationFound,
        possibleCause,
        recommendedSolution,
        requiredMaterials,
        needsQuote,
        needsReturn,
        recommendedPriority,
      });
      for (const f of fotos) {
        await enviarFoto(ticket.id, 'parecer', f.arquivo);
      }
      descartarPreviews(fotos);
      setFotos([]);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Parecer Técnico da Vistoria</h3>
              <p className="text-xs text-slate-400">
                Laudo profissional de campo do chamado {ticket.protocol}
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
          {/* Read-only Tenant Reported Problem */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Problema informado pelo inquilino:
            </span>
            <p className="text-slate-800 font-medium">{ticket.description}</p>
            <p className="text-slate-500 text-[11px]">
              Imóvel: {ticket.address} ({ticket.environment})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Exibição, não escolha: o parecer é assinado por quem está
                designado ao chamado, e quem resolve isso é o servidor. */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Técnico Vistoriador
              </label>
              <div className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700">
                {ticket.assignedTechnicianName ?? 'Nenhum técnico designado'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prioridade Técnica Recomendada
              </label>
              <select
                value={recommendedPriority}
                onChange={(e) => setRecommendedPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              >
                <option value="emergencial">🔴 Emergencial</option>
                <option value="alta">🟠 Alta</option>
                <option value="normal">🟡 Normal</option>
                <option value="baixa">🟢 Baixa</option>
              </select>
            </div>
          </div>

          {/* Situation Found */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Situação Encontrada na Visita *
            </label>
            <textarea
              required
              rows={2}
              value={situationFound}
              onChange={(e) => setSituationFound(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="Descreva detalhadamente o estado encontrado..."
            />
          </div>

          {/* Possible Cause */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Possível Causa *</label>
            <input
              type="text"
              required
              value={possibleCause}
              onChange={(e) => setPossibleCause(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="Ex: Fadiga do material, conexão danificada, sobrecarga..."
            />
          </div>

          {/* Recommended Solution */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Solução Recomendada *
            </label>
            <textarea
              required
              rows={2}
              value={recommendedSolution}
              onChange={(e) => setRecommendedSolution(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="Ações necessárias para solucionar o problema em definitivo..."
            />
          </div>

          {/* Materials */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Materiais Necessários *
            </label>
            <input
              type="text"
              required
              value={requiredMaterials}
              onChange={(e) => setRequiredMaterials(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="Liste as peças e materiais que serão utilizados..."
            />
          </div>

          {/* Yes/No Toggles */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1.5">
                Necessita Orçamento?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNeedsQuote(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    needsQuote
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600'
                  }`}
                >
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => setNeedsQuote(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    !needsQuote
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600'
                  }`}
                >
                  NÃO
                </button>
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1.5">
                Necessita Retorno / Segunda Visita?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNeedsReturn(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    needsReturn
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600'
                  }`}
                >
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => setNeedsReturn(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    !needsReturn
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-600'
                  }`}
                >
                  NÃO
                </button>
              </div>
            </div>
          </div>

          <PhotoUploader
            fotos={fotos}
            onChange={setFotos}
            label="Fotos da vistoria"
            hint="Registre o que encontrou: é o que sustenta o parecer e o orçamento."
            desabilitado={salvando}
          />

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
              className="disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-200 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{salvando ? 'SALVANDO…' : 'Salvar e Emitir Parecer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
