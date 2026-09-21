import React, { useState } from 'react';
import { MaintenanceTicket } from '../types';
import { X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/useApp';

interface ServiceCompletionModalProps {
  ticket: MaintenanceTicket;
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceCompletionModal: React.FC<ServiceCompletionModalProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  const { finalizeService } = useApp();

  const [servicesPerformed, setServicesPerformed] = useState(
    `Substituição das peças avariadas no ambiente ${ticket.environment}, vedação técnica e testes de funcionamento realizados com sucesso.`
  );
  const [materialsUsed, setMaterialsUsed] = useState(
    ticket.quote?.materialsSummary ||
      ticket.technicalReport?.requiredMaterials ||
      'Materiais de reposição originais.'
  );
  const [warrantyMonths, setWarrantyMonths] = useState<number>(3);
  const [observations, setObservations] = useState('');
  // Fotos "antes" partem das que o inquilino anexou ao abrir o chamado.
  const [beforePhotos] = useState<string[]>(ticket.photos.slice(0, 1));
  const [afterPhotos] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finalizeService(ticket.id, {
      ticketId: ticket.id,
      servicesPerformed,
      materialsUsed,
      warrantyMonths: Number(warrantyMonths),
      observations,
      beforePhotos,
      afterPhotos,
      tenantConfirmed: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Registrar Conclusão do Serviço</h3>
              <p className="text-xs text-slate-400">
                Finalização e termo de garantia do chamado {ticket.protocol}
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Serviço Realizado / Executado *
            </label>
            <textarea
              required
              rows={2}
              value={servicesPerformed}
              onChange={(e) => setServicesPerformed(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Materiais Efetivamente Utilizados *
            </label>
            <input
              type="text"
              required
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Garantia do Serviço (Meses) *
              </label>
              <select
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
              >
                <option value={3}>3 Meses (Garantia Legal)</option>
                <option value={6}>6 Meses (Recomendada)</option>
                <option value={12}>12 Meses (1 Ano)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data do Término</label>
              <input
                type="text"
                disabled
                value="Hoje (Registrado automaticamente)"
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-medium"
              />
            </div>
          </div>

          {/* Before & After Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Foto do Antes (Inicial)
              </span>
              <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-300 bg-slate-200">
                {beforePhotos[0] && (
                  <img
                    src={beforePhotos[0]}
                    alt="Antes"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Foto do Depois (Finalizado)
              </span>
              <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-300 bg-slate-200 relative group">
                {afterPhotos[0] && (
                  <img
                    src={afterPhotos[0]}
                    alt="Depois"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações Finais e Recomendações
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-200 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir Chamado</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
