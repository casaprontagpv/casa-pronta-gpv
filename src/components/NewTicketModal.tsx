import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, Home, Loader2, X } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useAcao } from '../hooks/useAcao';
import { ErroAcao } from './ErroAcao';
import { listarImoveisDisponiveis } from '../data/tickets';
import { getCategoryLabel } from '../utils/helpers';
import type { Category, PreferredPeriod, PriorityLevel } from '../types';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIAS: Category[] = [
  'hidraulica',
  'eletrica',
  'infiltracao',
  'pintura',
  'porta_fechadura',
  'janela',
  'revestimento_piso',
  'telhado',
  'outro',
];

const PRIORIDADES: { valor: PriorityLevel; label: string; hint: string }[] = [
  { valor: 'emergencial', label: 'Emergencial', hint: 'Risco imediato ou imóvel inabitável' },
  { valor: 'alta', label: 'Alta', hint: 'Atrapalha o uso diário' },
  { valor: 'normal', label: 'Normal', hint: 'Precisa de reparo, sem urgência' },
  { valor: 'baixa', label: 'Baixa', hint: 'Pode aguardar' },
];

const PERIODOS: { valor: PreferredPeriod; label: string }[] = [
  { valor: 'manha', label: 'Manhã (08h–12h)' },
  { valor: 'tarde', label: 'Tarde (13h–18h)' },
  { valor: 'integral', label: 'Horário comercial' },
  { valor: 'sabado', label: 'Sábado pela manhã' },
];

interface Imovel {
  id: string;
  code: string;
  address: string;
  unit: string | null;
}

/**
 * Abertura de chamado.
 *
 * O inquilino não digita mais o próprio nome, telefone e endereço — esses dados
 * vêm do vínculo com o imóvel, no servidor. No protótipo o formulário nascia
 * preenchido com os dados de outra pessoa, e o chamado saía no nome dela.
 *
 * A lista de imóveis é filtrada pela RLS: o inquilino vê o seu; a imobiliária,
 * os da carteira dela.
 */
export const NewTicketModal: React.FC<NewTicketModalProps> = ({ isOpen, onClose }) => {
  const { createTicket, setSelectedTicketId } = useApp();
  const { salvando, erro, executar } = useAcao();

  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [carregandoImoveis, setCarregandoImoveis] = useState(true);

  const [propertyId, setPropertyId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [category, setCategory] = useState<Category>('hidraulica');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<PriorityLevel>('normal');
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod>('manha');
  const [validacao, setValidacao] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCarregandoImoveis(true);
    listarImoveisDisponiveis()
      .then((lista) => {
        setImoveis(lista);
        // Inquilino costuma ter exatamente um imóvel: escolher por ele evita um
        // passo sem decisão.
        if (lista.length === 1 && lista[0]) setPropertyId(lista[0].id);
      })
      .catch(() => setImoveis([]))
      .finally(() => setCarregandoImoveis(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const limpar = () => {
    setEnvironment('');
    setDescription('');
    setUrgency('normal');
    setValidacao(null);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidacao(null);

    if (!propertyId) {
      setValidacao('Escolha o imóvel do chamado.');
      return;
    }
    if (!environment.trim()) {
      setValidacao('Informe em qual ambiente do imóvel está o problema.');
      return;
    }
    if (description.trim().length < 10) {
      setValidacao('Descreva o problema com um pouco mais de detalhe.');
      return;
    }

    await executar(
      async () => {
        const id = await createTicket({
          propertyId,
          environment: environment.trim(),
          category,
          description: description.trim(),
          urgency,
          preferredPeriod,
        });
        limpar();
        onClose();
        // Abre o chamado recém-criado: o protocolo aparece no detalhe.
        setSelectedTicketId(id);
      },
      () => undefined
    );
  };

  const rotuloImovel = (i: Imovel) => `${i.address}${i.unit ? ` — ${i.unit}` : ''} (${i.code})`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Abrir Chamado de Manutenção</h3>
              <p className="text-xs text-slate-400">
                Descreva o problema. A imobiliária recebe e autoriza a vistoria.
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

        <form onSubmit={enviar} className="p-6 overflow-y-auto flex-1 space-y-5">
          <ErroAcao mensagem={erro} />
          {validacao && (
            <div
              role="alert"
              className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900"
            >
              {validacao}
            </div>
          )}

          <div>
            <label htmlFor="nt-imovel" className="block text-xs font-bold text-slate-700 mb-1">
              Imóvel *
            </label>
            {carregandoImoveis ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Carregando seus imóveis…
              </div>
            ) : imoveis.length === 0 ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Nenhum imóvel vinculado à sua conta. Fale com a administração.
              </p>
            ) : (
              <select
                id="nt-imovel"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              >
                <option value="">Selecione…</option>
                {imoveis.map((i) => (
                  <option key={i.id} value={i.id}>
                    {rotuloImovel(i)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nt-ambiente" className="block text-xs font-bold text-slate-700 mb-1">
                Ambiente *
              </label>
              <input
                id="nt-ambiente"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="Cozinha, banheiro social, sala…"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="nt-categoria" className="block text-xs font-bold text-slate-700 mb-1">
                Categoria *
              </label>
              <select
                id="nt-categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="nt-descricao" className="block text-xs font-bold text-slate-700 mb-1">
              O que está acontecendo? *
            </label>
            <textarea
              id="nt-descricao"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema: onde começou, há quanto tempo, se piorou…"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Quanto mais detalhe, menos idas e vindas até o reparo.
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">Urgência</span>
            <div className="grid grid-cols-2 gap-2">
              {PRIORIDADES.map((p) => (
                <button
                  type="button"
                  key={p.valor}
                  onClick={() => setUrgency(p.valor)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    urgency === p.valor
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="block text-xs">{p.label}</span>
                  <span className="block text-[10px] text-slate-500 font-normal">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="nt-periodo" className="block text-xs font-bold text-slate-700 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Melhor período para o atendimento
            </label>
            <select
              id="nt-periodo"
              value={preferredPeriod}
              onChange={(e) => setPreferredPeriod(e.target.value as PreferredPeriod)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
            >
              {PERIODOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.label}
                </option>
              ))}
            </select>
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
              disabled={salvando || imoveis.length === 0}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg shadow-sm shadow-indigo-200 flex items-center gap-1.5 cursor-pointer"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ABRINDO…</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Abrir Chamado</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
