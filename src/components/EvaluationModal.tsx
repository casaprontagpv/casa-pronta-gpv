import React, { useState } from 'react';
import { MaintenanceTicket } from '../types';
import { X, Star, ThumbsUp } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useAcao } from '../hooks/useAcao';
import { ErroAcao } from './ErroAcao';

interface EvaluationModalProps {
  ticket: MaintenanceTicket;
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({ ticket, isOpen, onClose }) => {
  const { submitEvaluation } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [solved, setSolved] = useState<boolean>(true);
  const [satisfactory, setSatisfactory] = useState<boolean>(true);
  const [punctual, setPunctual] = useState<boolean>(true);
  const [comments, setComments] = useState(
    'Excelente atendimento! Problema resolvido com agilidade e cordialidade.'
  );

  // Antes do early return: hook não pode ser chamado condicionalmente.
  const { salvando, erro, executar } = useAcao();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executar(
      () => submitEvaluation(ticket.id, { rating, solved, satisfactory, punctual, comments }),
      onClose
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
              <Star className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Avaliação do Atendimento</h3>
              <p className="text-xs text-slate-400">Chamado {ticket.protocol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center py-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Sua nota geral para o serviço
            </span>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-125 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        active ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-amber-600 mt-1 block">
              {rating === 5
                ? '⭐ Excelente!'
                : rating === 4
                  ? '⭐ Muito Bom'
                  : rating === 3
                    ? '⭐ Regular'
                    : '⭐ Precisa Melhorar'}
            </span>
          </div>

          {/* Survey questions */}
          <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">O problema foi resolvido?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSolved(true)}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    solved ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setSolved(false)}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    !solved ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-medium text-slate-700">O atendimento foi satisfatório?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSatisfactory(true)}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    satisfactory ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setSatisfactory(false)}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    !satisfactory ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-medium text-slate-700">O profissional foi pontual?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPunctual(true)}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    punctual ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setPunctual(false)}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    !punctual ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gostaria de deixar um comentário?
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              placeholder="Conte como foi sua experiência..."
            />
          </div>

          <ErroAcao mensagem={erro} />

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm shadow-amber-200 cursor-pointer flex items-center gap-1.5"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{salvando ? 'ENVIANDO…' : 'Enviar Avaliação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
